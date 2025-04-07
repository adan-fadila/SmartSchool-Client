import React, { createContext, useState, useContext } from 'react';

const AnomalyContext = createContext();

export const AnomalyProvider = ({ children }) => {
  const [anomalies, setAnomalies] = useState({
    spaces: {},
    rooms: {}
  });

  const setSpaceAnomaly = (spaceId, anomalyData) => {
    console.log(`Setting anomaly for space with ID: ${spaceId}`, anomalyData);
    
    if (!anomalyData) {
      // Remove the anomaly for this space
      console.log(`Removing anomaly for space ${spaceId}`);
      setAnomalies(prev => ({
        ...prev,
        spaces: {
          ...prev.spaces,
          [spaceId]: undefined
        }
      }));
      return;
    }

    console.log(`Adding anomaly for space ${spaceId}`, anomalyData);
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
    console.log(`Setting anomaly for room with ID: ${roomId}`, anomalyData);
    
    // Ensure roomId is a string
    const roomIdStr = String(roomId);
    
    if (!anomalyData) {
      // Remove the anomaly for this room
      console.log(`Removing anomaly for room ${roomIdStr}`);
      setAnomalies(prev => ({
        ...prev,
        rooms: {
          ...prev.rooms,
          [roomIdStr]: undefined
        }
      }));
      return;
    }

    console.log(`Adding anomaly for room ${roomIdStr} with hasAnomaly=true`);
    setAnomalies(prev => ({
      ...prev,
      rooms: {
        ...prev.rooms,
        [roomIdStr]: {
          deviceType: anomalyData.deviceType,
          hasAnomaly: true,
          timestamp: anomalyData.timestamp,
          plotImage: anomalyData.plotImage,
          collectivePlot: anomalyData.collectivePlot,
          anomalies: anomalyData.anomalies,
          rawEventName: anomalyData.rawEventName,
          completeAnomalyName: anomalyData.completeAnomalyName,
          anomalyType: anomalyData.anomalyType,
          // Store all other original data fields to be safe
          location: anomalyData.location,
          sensorType: anomalyData.sensorType
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