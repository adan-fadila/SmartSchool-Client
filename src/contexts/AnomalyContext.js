import React, { createContext, useState, useContext } from 'react';

const AnomalyContext = createContext();

export const AnomalyProvider = ({ children }) => {
  const [anomalies, setAnomalies] = useState({
    spaces: {},
    rooms: {}
  });

  const setSpaceAnomaly = (spaceId, anomalyData) => {
    if (!anomalyData) {
      // Remove the anomaly for this space
      setAnomalies(prev => ({
        ...prev,
        spaces: {
          ...prev.spaces,
          [spaceId]: undefined
        }
      }));
      return;
    }

    setAnomalies(prev => ({
      ...prev,
      spaces: {
        ...prev.spaces,
        [spaceId]: {
          deviceType: anomalyData.deviceType,
          hasAnomaly: true,
          timestamp: anomalyData.timestamp
        }
      }
    }));
  };

  const setRoomAnomaly = (roomId, anomalyData) => {
    if (!anomalyData) {
      // Remove the anomaly for this room
      setAnomalies(prev => ({
        ...prev,
        rooms: {
          ...prev.rooms,
          [roomId]: undefined
        }
      }));
      return;
    }

    setAnomalies(prev => ({
      ...prev,
      rooms: {
        ...prev.rooms,
        [roomId]: {
          deviceType: anomalyData.deviceType,
          hasAnomaly: true,
          timestamp: anomalyData.timestamp,
          plotImage: anomalyData.plot_image,
          collectivePlot: anomalyData.collective_plot,
          anomalies: anomalyData.anomalies
        }
      }
    }));
  };

  return (
    <AnomalyContext.Provider value={{ anomalies, setSpaceAnomaly, setRoomAnomaly }}>
      {children}
    </AnomalyContext.Provider>
  );
};

export const useAnomaly = () => useContext(AnomalyContext); 