import os
import time
import json
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

load_dotenv()
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL is None:
    raise ValueError("DATABASE_URL environment variable must be set")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class PriceHistoryBenchmark:
    def __init__(self):
        self.session = SessionLocal()
        self.results = {}
        self.timestamp = datetime.now().isoformat()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.session.close()

    def log(self, message):
        """Simple logging function"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def get_shop_product_counts(self):
        """Get product counts per shop for context"""
        self.log("📊 Getting product counts per shop...")

        query = """
        SELECT 
            s.id,
            s.name,
            COUNT(p.id) as product_count
        FROM shops s
        LEFT JOIN products p ON p.shop_id = s.id
        GROUP BY s.id, s.name
        ORDER BY s.id
        """

        result = self.session.execute(text(query))
        shop_counts = {}

        print("\n" + "=" * 50)
        print("📊 PRODUCTS PER SHOP")
        print("=" * 50)

        for row in result:
            shop_counts[row.id] = {"name": row.name, "product_count": row.product_count}
            print(f"{row.name:30} | {row.product_count:>8,} products")

        print("=" * 50)

        self.results["shop_product_counts"] = shop_counts
        return shop_counts

    def benchmark_search_query(self, iterations=20):
        """Benchmark the main search query with different scenarios"""
        self.log(f"🚀 Benchmarking search query ({iterations} iterations)...")

        # Get shop IDs
        shop_ids_query = "SELECT id FROM shops ORDER BY id"
        shop_result = self.session.execute(text(shop_ids_query))
        shop_ids = [row.id for row in shop_result]

        if not shop_ids:
            self.log("❌ No shops found in database")
            return {}

        # Base query
        base_query = """SELECT
            p.id,
            p.name,
            p.link,
            p.img_thumbnail_src,
            p.img_full_src,
            p.shop_id,
            s.name AS shop_name,
            lp.regular_price,
            lp.discounted_price,
            lp.price_per_kg,
            lp.discounted_price_per_kg,
            lp.sale_tag,
            lp.discount_percentage,
            lp.created_at AS price_created_at
        FROM products p
        JOIN shops s ON p.shop_id = s.id
        LEFT JOIN LATERAL (
            SELECT ph.*
            FROM price_history ph
            WHERE ph.product_id = p.id
            ORDER BY ph.created_at DESC
            LIMIT 1
        ) lp ON true
        WHERE s.id = ANY(:shop_ids)"""

        # Test scenarios: shop counts × search terms
        shop_scenarios = [
            {"name": "1_shop", "shop_ids": shop_ids[:1]},
            {"name": "3_shops", "shop_ids": shop_ids[:3] if len(shop_ids) >= 3 else shop_ids},
            {"name": "all_shops", "shop_ids": shop_ids},
        ]

        search_scenarios = [
            {"name": "no_search", "terms": []},
            {"name": "1_term", "terms": ["γαλα"]},  # milk
            {"name": "3_terms", "terms": ["γαλα", "χωρις", "λακτοζη"]},  # milk without lactose
        ]

        benchmark_results = {}

        for shop_scenario in shop_scenarios:
            for search_scenario in search_scenarios:
                # Build query
                sql = base_query
                params = {
                    "shop_ids": shop_scenario["shop_ids"],
                    "limit": 20,
                    "offset": 0,
                }

                # Add search terms
                for i, term in enumerate(search_scenario["terms"]):
                    sql += f" AND p.name_normalized ILIKE :term{i}"
                    params[f"term{i}"] = f"%{term}%"

                # Add ordering and limit
                sql += """
                ORDER BY lp.created_at DESC NULLS LAST
                LIMIT :limit OFFSET :offset"""

                # Run benchmark
                scenario_name = f"{shop_scenario['name']}_{search_scenario['name']}"
                times = []
                record_counts = []

                for _ in range(iterations):
                    start_time = time.time()
                    result = self.session.execute(text(sql), params)
                    rows = result.fetchall()
                    execution_time = time.time() - start_time

                    times.append(execution_time)
                    record_counts.append(len(rows))

                benchmark_results[scenario_name] = {
                    "avg_time_ms": (sum(times) / len(times)) * 1000,
                    "min_time_ms": min(times) * 1000,
                    "max_time_ms": max(times) * 1000,
                    "avg_records": sum(record_counts) / len(record_counts),
                    "shop_count": len(shop_scenario["shop_ids"]),
                    "search_term_count": len(search_scenario["terms"]),
                }

        self.results["search_benchmark"] = benchmark_results

        # Print results

        print("\n-- SEARCH QUERY BENCHMARK --")
        print(
            f"{'Scenario':20} | {'Shops':6} | {'Terms':6} | {'Avg (ms)':10} | {'Min (ms)':10} | {'Max (ms)':10} | {'Records':8}"
        )
        print("-" * 90)

        for scenario_name, data in benchmark_results.items():
            print(
                f"{scenario_name:20} | {data['shop_count']:6} | {data['search_term_count']:6} | "
                f"{data['avg_time_ms']:10.1f} | {data['min_time_ms']:10.1f} | {data['max_time_ms']:10.1f} | {data['avg_records']:8.0f}"
            )

        print("=" * 90)

        return benchmark_results

    def analyze_query_plan(self):
        """Get EXPLAIN ANALYZE for the main query"""
        self.log("📋 Analyzing query execution plan...")

        shop_result = self.session.execute(text("SELECT id FROM shops LIMIT 1"))
        shop_ids = [row.id for row in shop_result]

        if not shop_ids:
            return {}

        explain_query = """
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT
            p.id,
            p.name,
            s.name AS shop_name,
            lp.regular_price,
            lp.discounted_price,
            lp.sale_tag,
            lp.created_at AS price_created_at
        FROM products p
        JOIN shops s ON p.shop_id = s.id
        LEFT JOIN LATERAL (
            SELECT ph.*
            FROM price_history ph
            WHERE ph.product_id = p.id
            ORDER BY ph.created_at DESC
            LIMIT 1
        ) lp ON true
        WHERE s.id = ANY(:shop_ids)
        ORDER BY lp.created_at DESC NULLS LAST
        LIMIT 20
        """

        result = self.session.execute(text(explain_query), {"shop_ids": shop_ids})
        explain_result = result.fetchone()[0]

        self.results["query_plan"] = explain_result

        plan = explain_result[0]["Plan"]
        print("\n" + "=" * 50)
        print("📋 QUERY EXECUTION PLAN (1 shop)")
        print("=" * 50)
        print(f"Total Cost: {plan.get('Total Cost', 'N/A'):.2f}")
        print(f"Actual Time: {plan.get('Actual Total Time', 'N/A'):.2f} ms")
        print(f"Rows: {plan.get('Actual Rows', 'N/A')}")
        print("=" * 50)

        return explain_result

    def run_benchmark(self):
        """Run benchmark suite"""
        self.log("🎯 Starting benchmark...")

        # Update statistics
        self.log("📊 Updating table statistics...")
        self.session.execute(text("ANALYZE price_history"))
        self.session.execute(text("ANALYZE products"))
        self.session.execute(text("ANALYZE shops"))
        self.session.commit()

        # Run benchmarks
        self.get_shop_product_counts()
        self.benchmark_search_query()
        self.analyze_query_plan()

        # Add metadata
        self.results["metadata"] = {
            "timestamp": self.timestamp,
            "benchmark_version": "2.0_simplified",
        }

        self.log("Benchmark completed!")
        return self.results

    def export_results(self, filename=None):
        """Export results to JSON file"""
        if filename is None:
            filename = f"benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        with open(filename, "w") as f:
            json.dump(self.results, f, indent=2, default=str)

        self.log(f"📄 Results exported to {filename}")
        return filename

    def print_summary(self):
        """Print benchmark summary"""
        if not self.results:
            print("❌ No results to summarize")
            return

        print("\n" + "=" * 30)
        print("📊 SUMMARY")
        print("-" * 30)

        if "shop_product_counts" in self.results:
            total_products = sum(shop["product_count"] for shop in self.results["shop_product_counts"].values())
            print(f"Total Products: {total_products:,}")

        if "search_benchmark" in self.results:
            # Get 1 shop no search as baseline
            baseline = self.results["search_benchmark"].get("1_shop_no_search", {})
            if baseline:
                print(f"Baseline (1 shop, no search): {baseline.get('avg_time_ms', 0):.1f}ms")

            # Get all shops no search
            all_shops = self.results["search_benchmark"].get("all_shops_no_search", {})
            if all_shops:
                print(f"All shops (no search): {all_shops.get('avg_time_ms', 0):.1f}ms")

        print("-" * 30)


def main():
    """Main execution function"""
    print("🚀 Price History Database Benchmark")
    print("-" * 30)

    with PriceHistoryBenchmark() as benchmark:
        results = benchmark.run_benchmark()
        benchmark.print_summary()

        # Export results
        filename = benchmark.export_results()
        print(f"\n📄 Results saved to: {filename}")

        return results


if __name__ == "__main__":
    main()
