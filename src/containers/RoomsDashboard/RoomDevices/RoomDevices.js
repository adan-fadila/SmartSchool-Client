import React, { useEffect, useState } from "react";
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


  useEffect(() => {
    fetchRoomData();
    fetchRoomDevices();
  }, []);

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
        
        console.log("Processing anomaly array:", anomalyArr);
        
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
        {roomDevices.map((device) => {
          console.log("Full device data:", device);
          console.log("Rendering device:", {
            deviceId: device.device_id,
            deviceName: device.name,
            deviceType: device.device_type,
            anomalyType: anomalies.rooms[id]?.deviceType
          });
          
          return (
            <div key={device.device_id} className={classes.DeviceWrapper}>
              {anomalies.rooms[id]?.deviceType === 'AC' && device.device_id === DEVICES_IDS_MAP.AC && (
                <div 
                  className={classes.anomalyIndicator}
                  onClick={handleAnomalyClick}
                  style={{ cursor: 'pointer' }}
                >
                  <FontAwesomeIcon
                    icon={faLightbulb}
                    className={classes.flickeringIcon}
                  />
                </div>
              )}
              <Device
                device={device}
                onToggleDeviceSwitch={getToggleFunctionForDevice(device)}
                pumpDuration={pumpDuration}
                setPumpDuration={setPumpDuration}
                spaceId={spaceId}
              />
            </div>
          );
        })}
        <NewDevice setIsModalOpen={setIsModalOpen} />
      </DevicesSection>

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
