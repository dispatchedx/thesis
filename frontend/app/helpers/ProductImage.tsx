import { Product } from "../types/Types";

export function getBestImageUrl(item: Product): string | null {
  if (isValidImageUrl(item.img_thumbnail_src)) {
    //console.log("thumbnail passed!");
    return item.img_thumbnail_src;
  }
  if (isValidImageUrl(item.img_full_src)) {
    //console.log("full image passed!");
    return item.img_full_src;
  }
  return null;
}
function isValidImageUrl(url: any): boolean {
  return (
    typeof url === "string" &&
    /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(url)
  );
}
