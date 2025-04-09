import React, { useEffect, useState, useContext } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import {
  fetchRoomDevices,
} from "./../../../store/devices/devices.actions";
import { NavLink } from "react-router-dom";
import { useParams } from "react-router";

import classes from "./RoomDevices.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { toggleAcState, executeAcCommand } from "../../../services/ac.service";
import { Device } from "../../../components/Device/Device";
import { SERVER_URL } from "../../../consts";
import _ from "lodash";
import styled, { keyframes } from "styled-components";
import { NewDevice } from "../../../components/Device/NewDevice";
import Modal from "react-modal";
import { NewDeviceModal } from "../../../components/Device/NewDeviceModal";
import pumpService from '../../../services/pump.service';
import RoomMap from '../../..//components/RoomMap/RoomMap';
import iconMapping from './../../../utils/fontawesome.icons';
import houseMapClasses from '../../../components/RoomMap/RoomMap.module.scss';
import { useAnomaly } from '../../../contexts/AnomalyContext';
import { faLightbulb } from "@fortawesome/free-solid-svg-icons";
import AuthContext from "../../../contexts/AuthContext";

Modal.setAppElement('#root') 

const fadeIn = keyframes`
  0% {
    opacity: 0;
    width: 0;
    height: 0;
  }
  50% {
    opacity: 1;
    width: 95%;
    height: 95%;
  }
  100% {
    opacity: 1;
    width: 90%;
    height: 90%;
  }
`;

export const ModalStyled = styled(Modal)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 4px;
  width: 90%;
  height: 90%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  margin: 1rem;
  padding: 1.5rem;
  overflow: auto;
  display: flex;
  justify-content: center;
  border: none;
  outline: none;

  //animation
  opacity: 0;
  width: 0;
  height: 0;
  animation: ${fadeIn} 0.3s ease-in-out forwards;
`;

const DevicesSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  // padding: 10px;
  gap: 2rem;
  @media (max-width: 912px) {
    justify-content: center

  }
  // Media query for mobile devices
  @media (max-width: 480px) {
    justify-content: center

  }

`;

const RoomContainer = styled.div`
  padding: 30px;
  margin-right: 5rem;
  margin-left: 5rem;
  @media (max-width: 768px) {
    justify-content: center
    padding: 15px;
    margin-right: 2rem;
    margin-left: 2rem;
  }
  // Media query for mobile devices
  @media (max-width: 480px) {
    padding: 10px;
    margin-right: 1rem;
    justify-content: center
    margin-left: 1rem;
  }
`;

const NavLinkStyled = styled(NavLink)`
  color: green;
  // padding: 10rem;
`;

const DEVICES_IDS_MAP = {
  AC: "4ahpAkJ9",
  LAUNDRY: "0e4be594-13bb-fe76-f092-c8dbdede80b2",
  HEATER: "061751378caab5219d31",
  PUMP: "061751378caab5219d33"
};


const H1 = styled.p`
  font-size: 2rem;

  @media (max-width: 768px) { /* Tablet view */
    font-size: 1.5rem;
  }

  @media (max-width: 480px) { /* Mobile view */
    font-size: 1.5rem;
  }
`;

const togglePump = async (state, duration) => {
  try {
    const response = await pumpService.controlPump(state, duration);
    console.log(response);
  } catch (error) {
    console.error(error);
  }
};

const laundryToggle = async ({ state, id }) => {
  try {
    const response = await axios.post(`${SERVER_URL}/smartthings/toggle`, {
      
      state,
      deviceId: id,
    });
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

const toggleHeater = async (value) => {
  try {
    const response = await axios.post(`${SERVER_URL}/heater`, { value });
    console.log('toogllle hteaer!!!!')
    return response;
  } catch (error) {
    console.error(error);
  }
};

const RoomDevices = () => {
  const [devices, setDevices] = React.useState([]);
  const [laundryDetails, setLaundryDetails] = React.useState({});
  const [room, setRoom] = useState({});
  const [roomDevices, setRoomDevices] = useState([]);
  const [rpiSensors, setRpiSensors] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pumpState, setPumpState] = useState('OFF');
  const [pumpDuration, setPumpDuration] = useState(0.05);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const { anomalies, setRoomAnomaly, setSpaceAnomaly } = useAnomaly();
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [anomalyImage, setAnomalyImage] = useState('');
  const [plotImage, setPlotImage] = useState('');
  const [collectivePlot, setCollectivePlot] = useState('');
  const [anomalyDetails, setAnomalyDetails] = useState([]);
  const [anomalyDescription, setAnomalyDescription] = useState('');
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { user } = useContext(AuthContext);
  
  // Define IDS_TOGGLES_MAP inside the component to access the room state
  const IDS_TOGGLES_MAP = {
    [DEVICES_IDS_MAP.AC]: (props) => {
      // Get room name safely, with fallback
      const roomName = _.get(room, "name", "Unknown Room");
      
      // Log what we're passing to executeAcCommand
      console.log("AC toggle request with props:", props);
      console.log("Room name for action string:", roomName);
      
      if (!roomName || roomName === "Unknown Room") {
        console.warn("Room name might be missing or invalid:", roomName);
      }
      
      return executeAcCommand({ 
        ...props, 
        roomName 
      });
    },
    [DEVICES_IDS_MAP.LAUNDRY]: laundryToggle,
    [DEVICES_IDS_MAP.HEATER]: toggleHeater,
    [DEVICES_IDS_MAP.PUMP]: togglePump,
  };
  
  // Function to get the appropriate toggle function for a device
  const getToggleFunctionForDevice = (device) => {
    // Check if this is an AC device, regardless of ID
    if (device.device_name.toLowerCase() === 'ac') {
      // Return the AC toggle function
      return (props) => {
        const roomName = _.get(room, "name", "Unknown Room");
        return executeAcCommand({
          ...props,
          roomName
        });
      };
    }
    
    // For other devices, check ID map
    const toggleFunction = IDS_TOGGLES_MAP[device.device_id];
    
    if (toggleFunction) {
      return toggleFunction;
    }
    
    console.warn(`No toggle function found for device: ${device.device_name} (${device.device_id})`);
    return undefined;
  };
    
  const openHouseMap = () => {
      setModalIsOpen(true);
  };
  
  const { id,spaceId } = useParams();


  const fetchLaundryDetails = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/laundry/details/`);
      setLaundryDetails(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const laundryDevice = devices.find((device) => device.name === "laundry");
    if (laundryDevice) {
      fetchLaundryDetails();
    }
  }, [devices]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const devicesFromDB = await axios.get(`${SERVER_URL}/api-device/devices`);
        setDevices(devicesFromDB.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);


  const fetchRoomData = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api-room/rooms/${id}`);
      setRoom(response.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoomDevices = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api-device/room-devices/${id}`);
      setRoomDevices(_.get(response, "data.data", []));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePumpToggle = async ({ state, duration }) => {
    try {
      const newState = pumpState === 'ON' ? 'OFF' : 'ON';
      await pumpService.controlPump(newState, duration * 60); // Convert minutes to seconds
      setPumpState(newState);
    } catch (error) {
      console.error(error);
    }
  };

  // New function to fetch RPi sensors
  const fetchRpiSensors = async () => {
    if (!id || !room.name) {
      console.log("Skipping RPi sensor fetch: roomId or room name not available yet.");
      return; // Need roomId (id) and room.name for filtering
    }
    try {
      const response = await axios.get(`${SERVER_URL}/api-sensors/sensors-all-locations`);
      const allRoomSensorData = response.data.room_sensor_data;

      // Find the entry for the current room using roomId (id)
      const currentRoomData = Object.values(allRoomSensorData).find(data => data.roomId === id);

      if (currentRoomData && currentRoomData.pi_response && !currentRoomData.error) {
        // Assuming pi_response structure is like: { "livingroom": { "name": "Living Room", "sensors": ["temperature", "humidity"] } }
        // We need the inner key ("livingroom") which might not match room.name exactly if there are spaces/case differences
        // Let's assume the first key inside pi_response is the relevant one for that Pi
        const piLocationKey = Object.keys(currentRoomData.pi_response)[0];
        const sensorTypes = currentRoomData.pi_response[piLocationKey]?.sensors || [];

        const transformedSensors = sensorTypes.map(sensorType => ({
          device_id: `rpi-${id}-${sensorType}`, // Create a unique placeholder ID
          name: `${room.name} ${_.capitalize(sensorType)}`, // Construct user-friendly name
          device_name: _.capitalize(sensorType), // Add device_name, using capitalized type
          device_type: sensorType, // Use raw sensor type as device_type
          isRpiSensor: true, // Flag to identify these sensors
          status: 'N/A', // Placeholder status
          // Add placeholder for other fields expected by <Device> if necessary
        }));
        setRpiSensors(transformedSensors);
        console.log("RPi Sensors Processed:", transformedSensors);

      } else if (currentRoomData && currentRoomData.error) {
         console.error(`Error fetching RPi sensors for room ${id} (${room.name}): ${currentRoomData.error}`);
         setRpiSensors([]); // Clear sensors if there was an error for this room
      } else {
        console.log(`No RPi sensor data found for room ${id} in the API response.`);
        setRpiSensors([]);
      }

    } catch (error) {
      console.error("Failed to fetch RPi sensors:", error);
      setRpiSensors([]); // Clear on general fetch failure
    }
  };

  useEffect(() => {
    fetchRoomData();
    fetchRoomDevices();
    // We need room data (specifically room.name) before fetching RPi sensors
    // Let's fetch RPi sensors in a separate effect that depends on room
  }, [id]); // Keep initial fetches dependent only on id

  // New useEffect to fetch RPi sensors after room data is available
  useEffect(() => {
    if (room && room.name && id) {
      fetchRpiSensors();
    }
  }, [room, id]); // Runs when room or id changes

  useEffect(() => {
    console.log("Current room ID:", id);
    console.log("Current anomalies:", anomalies);
    console.log("Room devices:", roomDevices);
  }, [id, anomalies, roomDevices]);

  useEffect(() => {
    if (anomalies.rooms[id]) {
        console.log("Full anomaly data:", anomalies.rooms[id]);
        
        // Extract the anomalies array from the WebSocket message
        const anomalyArr = anomalies.rooms[id].anomalies || [];
        const plotImg = anomalies.rooms[id].plotImage;
        const collectiveImg = anomalies.rooms[id].collectivePlot;
        const sensorType = anomalies.rooms[id].deviceType;
        
        console.log("Processing anomaly array:", anomalyArr);
        console.log("Sensor type with anomaly:", sensorType);
        
        if (plotImg) {
            setPlotImage(plotImg);
        }
        if (collectiveImg) {
            setCollectivePlot(collectiveImg);
        }
        if (Array.isArray(anomalyArr)) {
            setAnomalyDetails(anomalyArr);
            console.log("Set anomaly details:", anomalyArr);
        }
    }
  }, [anomalies, id]);

  const handleAnomalyClick = () => {
    setShowAnomalyModal(true);
    // Reset states when opening modal
    setAnomalyDescription('');
    setSaveSuccess(false);
    // Log user object for debugging
    console.log('Current user object:', user);
  };

  const handleDeviceAnomalyClick = (e) => {
    e.stopPropagation(); // Prevent device card click
    setShowAnomalyModal(true);
    // Reset states when opening modal
    setAnomalyDescription('');
    setSaveSuccess(false);
  };

  const handleSaveAnomalyDescription = async () => {
    if (!anomalyDescription.trim()) return;
    
    setIsSavingDescription(true);
    
    try {
      // Get the anomaly data from the WebSocket message
      const anomalyData = anomalies.rooms[id];
      
      // Log anomaly data for debugging
      console.log("FULL ANOMALY DATA:", anomalyData);
      
      // Use the actual anomaly type from the WebSocket data
      const anomalyType = anomalyData?.anomalyType || 'pointwise'; // Fallback to pointwise if not specified
      const rawEventName = `${anomalyData?.location || 'living room'} ${anomalyData?.sensorType || 'temperature'} ${anomalyType} anomaly`;
      
      console.log("Using anomaly type from WebSocket:", anomalyType);
      console.log("Constructed rawEventName:", rawEventName);
      
      // Look for different possible versions of userId in the user object
      const userId = user?._id || user?.id || (user?.user && (user.user._id || user.user.id));
      
      if (!userId) {
        console.error('User ID not found in the user object:', user);
        throw new Error('User ID not found');
      }
      
      const payload = {
        rawEventName,
        description: anomalyDescription,
        roomId: id,
        spaceId: spaceId,
        userId: userId,
        metricType: anomalyData?.sensorType || 'temperature',
        anomalyType: anomalyType,
        location: anomalyData?.location || 'living room'
      };
      
      console.log('Saving anomaly description:', payload);
      
      const response = await fetch(`${SERVER_URL}/api/anomaly-descriptions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error('Failed to save anomaly description: ' + errorText);
      }
      
      const result = await response.json();
      console.log('Anomaly description saved:', result);
      setSaveSuccess(true);
      
      // Clear description after successful save
      setAnomalyDescription('');
    } catch (error) {
      console.error('Error saving anomaly description:', error);
      // Could add toast notification here
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleDismissAnomaly = () => {
    // Update both room and space anomalies
    setRoomAnomaly(id, null);
    setSpaceAnomaly(spaceId, null);
    
    // Close modal
    setShowAnomalyModal(false);
    
    console.log("Anomaly dismissed successfully");
  };

  if (!devices) return null;

  // Keep devices and sensors separate
  console.log("Room Devices (DB):", roomDevices);
  console.log("RPi Sensors (API):", rpiSensors);

  return (
    <RoomContainer>
      <NavLinkStyled to={`/spaces/${spaceId}/rooms-dashboard`} className={classes.BackLink}>
        <FontAwesomeIcon icon={faChevronLeft} />
        <span>Back to Rooms</span>
      </NavLinkStyled>
      {/* <div className={classes.RoomsPage}>
            <button className={classes.RoomsPageButton} onClick={openHouseMap}>Rooms Map</button>
          </div> */}
          <Modal
                isOpen={modalIsOpen}
                onRequestClose={() => setModalIsOpen(false)}
                contentLabel="Rooms Map"
                className={houseMapClasses.Modal}
            >
                <RoomMap onClose={() => setModalIsOpen(false)} spaceId={spaceId} id={id} />
          </Modal>
      <H1>{_.get(room, "name")}</H1>
      <DevicesSection>
        {/* Map over devices from the database */}
        {roomDevices.map((device) => {
          // Ensure device and device_id are valid before rendering
          if (!device || !device.device_id) {
            console.warn("Skipping rendering of invalid device object:", device);
            return null;
          }
          console.log("Rendering DB device:", device);
          // Existing logging can remain or be adjusted
          // console.log("Full device data:", device);
          // console.log("Rendering device:", {
          //   deviceId: device.device_id,
          //   deviceName: device.name,
          //   deviceType: device.device_type,
          //   anomalyType: anomalies.rooms[id]?.deviceType
          // });

          return (
            <div key={device.device_id} className={classes.DeviceWrapper}>
              {/* Anomaly indicator moved inside Device component */}
              <Device
                device={device}
                onToggleDeviceSwitch={getToggleFunctionForDevice(device)}
                pumpDuration={device.device_type === 'pump' ? pumpDuration : undefined}
                setPumpDuration={device.device_type === 'pump' ? setPumpDuration : undefined}
                spaceId={spaceId}
                isRpiSensor={false}
                hasAnomaly={anomalies.rooms[id]?.deviceType === 'AC' && device.device_id === DEVICES_IDS_MAP.AC}
                onAnomalyClick={handleDeviceAnomalyClick}
              />
            </div>
          );
        })}
        <NewDevice setIsModalOpen={setIsModalOpen} />
      </DevicesSection>

      {/* Section for RPi Sensors */}
      {rpiSensors.length > 0 && (
        <>
          <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Sensors</h3>
          <DevicesSection>
            {rpiSensors.map((sensor) => {
              // Ensure sensor object and id are valid
              if (!sensor || !sensor.device_id) {
                console.warn("Skipping rendering of invalid sensor object:", sensor);
                return null;
              }
              console.log("Rendering RPi sensor:", sensor);
              return (
                <div key={sensor.device_id} className={classes.DeviceWrapper}>
                  {/* No anomaly indicator shown for sensors currently */}
                  <Device
                    device={sensor}
                    onToggleDeviceSwitch={undefined}
                    pumpDuration={undefined}
                    setPumpDuration={undefined}
                    spaceId={spaceId}
                    isRpiSensor={true}
                    hasAnomaly={anomalies.rooms[id]?.deviceType === sensor.device_type.toLowerCase()}
                    onAnomalyClick={handleDeviceAnomalyClick}
                  />
                </div>
              );
            })}
          </DevicesSection>
        </>
      )}

      <ModalStyled
        isOpen={showAnomalyModal}
        onRequestClose={() => setShowAnomalyModal(false)}
        contentLabel="Anomaly Details"
      >
        <div className={classes.AnomalyModal}>
          <h2>Anomaly Detected</h2>
          
          <div className={classes.AnomalyDetails}>
            {anomalyDetails.length > 0 && (
              <>
                <h3>Detection Details</h3>
                <div className={classes.AnomalyValues}>
                  <h4>Anomaly Values:</h4>
                  <ul>
                    {anomalyDetails.map((detail, index) => (
                      <li key={index}>
                        <div className={classes.AnomalyItem}>
                          <span className={classes.DetectionNumber}>Detection #{index + 1}</span>
                          <span className={classes.AnomalyValue}>Value: {detail.anomaly_val.toFixed(2)}</span>
                          <span className={classes.Algorithms}>
                            Detected by: {detail.voting_algorithms.split(',').map(algo => algo.replace('Algorithm', '')).join(' & ')}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          <div className={classes.ImagesContainer}>
            {plotImage && (
              <div className={classes.ImageSection}>
                <h3>Anomaly Plot</h3>
                <img 
                  src={`data:image/png;base64,${plotImage}`} 
                  alt="Anomaly Plot" 
                  className={classes.AnomalyImage}
                />
              </div>
            )}
            {collectivePlot && (
              <div className={classes.ImageSection}>
                <h3>Collective Plot</h3>
                <img 
                  src={`data:image/png;base64,${collectivePlot}`} 
                  alt="Collective Plot" 
                  className={classes.AnomalyImage}
                />
              </div>
            )}
          </div>
          
          <div className={classes.DescriptionSection}>
            <h3>Add Description</h3>
            <p className={classes.DescriptionNote}>
              Please describe what might have caused this anomaly:
            </p>
            <textarea
              value={anomalyDescription}
              onChange={(e) => setAnomalyDescription(e.target.value)}
              placeholder="Enter anomaly description..."
              className={classes.DescriptionInput}
              disabled={saveSuccess}
              rows={4}
            />
            {saveSuccess ? (
              <div className={classes.SaveSuccess}>Description saved successfully!</div>
            ) : (
              <button 
                onClick={handleSaveAnomalyDescription} 
                className={classes.SaveButton}
                disabled={isSavingDescription || !anomalyDescription.trim()}
              >
                {isSavingDescription ? 'Saving...' : 'Save Description'}
              </button>
            )}
          </div>
          
          <button onClick={handleDismissAnomaly} className={classes.DismissButton}>
            Dismiss Anomaly
          </button>
        </div>
      </ModalStyled>

      {isModalOpen &&
        <ModalStyled isOpen={isModalOpen}>
          <NewDeviceModal setIsModalOpen={setIsModalOpen} spaceId={spaceId} roomId={id} fetchRoomDevices={fetchRoomDevices} />
        </ModalStyled>
      }
    </RoomContainer>
  );

};

RoomDevices.propTypes = {
  fetchRoomDevices: PropTypes.func,
};

const mapStateToProps = (state) => ({
  devices: state.devices.devices,
});

const mapDispatchToProps = {
  fetchRoomDevices,
};

export default connect(mapStateToProps, mapDispatchToProps)(RoomDevices);
