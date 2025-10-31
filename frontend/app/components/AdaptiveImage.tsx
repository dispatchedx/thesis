import React, { useState, useRef, useEffect } from "react";
import { Platform, View, Image as RNImage, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image"; //default lazy loading, caching +more
const PlaceholderImage = require("@/assets/images/placeholder.png");

type AdaptiveImageProps = {
  uri: string | null;
  style?: any;
};

const AdaptiveImage: React.FC<AdaptiveImageProps> = ({ uri, style }) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(Platform.OS !== "web"); // true by default on native
  const wrapperRef = useRef<any>(null);

  // Observe visibility on web
  useEffect(() => {
    if (Platform.OS !== "web" || !wrapperRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(wrapperRef.current);

    return () => observer.disconnect();
  }, []);

  // Convert React Native styles to CSS for web
  const getWebStyles = () => {
    const webStyle: React.CSSProperties = {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      opacity: loaded ? 1 : 0,
      transition: "opacity 0.3s ease-in-out",
    };

    if (style) {
      if (style.width) webStyle.width = style.width;
      if (style.height) webStyle.height = style.height;
      if (style.borderRadius) webStyle.borderRadius = style.borderRadius;
      if (style.backgroundColor)
        webStyle.backgroundColor = style.backgroundColor;
    }

    return webStyle;
  };

  if (Platform.OS === "web") {
    return (
      <View ref={wrapperRef} style={[style, styles.webWrapper]}>
        {!loaded && (
          <RNImage
            source={PlaceholderImage}
            style={[style, styles.placeholder]}
          />
        )}
        {inView && (
          <img
            src={error || !uri ? PlaceholderImage : uri}
            alt=""
            loading="lazy"
            onError={() => setError(true)}
            onLoad={() => setLoaded(true)}
            style={getWebStyles()}
          />
        )}
      </View>
    );
  }

  return (
    <View ref={wrapperRef} style={[styles.container, style]}>
      {inView && uri && !error ? (
        <ExpoImage
          source={{ uri }}
          style={[styles.image, style]}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          transition={300}
          contentFit="cover"
        />
      ) : (
        <ExpoImage
          source={PlaceholderImage}
          style={[styles.image, style]}
          contentFit="cover"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  webWrapper: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  placeholder: {
    position: "absolute",
    zIndex: 0,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
});

export default AdaptiveImage;
