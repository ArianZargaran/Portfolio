import React, { PropsWithChildren, ReactNode, useState } from "react";

export const RefreshStoryWrapper: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey(refreshKey + 1);

  return (
    <div
      style={{
        position: "relative",
        padding: "100px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <button
          style={{
            position: "absolute",
            top: 10,
            right: 10,
          }}
          onClick={handleRefresh}
        >
          Replay
        </button>
        {React.Children.map<ReactNode, ReactNode>(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { key: refreshKey });
          }
        })}
      </div>
    </div>
  );
};
