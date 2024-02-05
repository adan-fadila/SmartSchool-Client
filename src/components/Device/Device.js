// import Switch from '@mui/material/Switch';
// import { Button, CircularProgress, Snackbar, MuiAlert } from '@material-ui/core';
import { Button } from "@material-ui/core";
import React, { useEffect, useState } from "react";
import styled, { css } from "styled-components";
import { Temperature } from "./Controls/CustomControls/Temperature";
import { SnackBar } from "../Snackbar/SnackBar";
import Switch from "../UI/Switch/Switch";
import ModeControl from "./Controls/Mode/ModeControl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { MenuItem, Select } from "@material-ui/core";
import axios from "axios";
import { SERVER_URL } from "../../consts";
import { AcControls } from "./Controls/CustomControls/AcControls";
import { LaundryControls } from "./Controls/CustomControls/LaundryControls";
import { PumpControls } from "./Controls/CustomControls/PumpControls";


const DeviceCard = styled.div`
  width: 18rem;
  min-width: 18rem;
  height: ${({ height }) => height};
  border: 1px solid;
  // margin: 1rem;
  padding: 1rem;
  border-radius: 10px;
  border-color: #e4e6eb;
  min-height: 8rem;
  // background-color: ${({ color }) => color}
  transition: width 0.4s, height 0.4s;
  &.expanded {
    height: 300px;
    width: ${({ isLaundryDevice }) => (isLaundryDevice ? "30rem" : "18rem")};
  }
`;

const ControlContainer = styled.div`
  transition: opacity 0.4s ease-in-out;
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};
`;

const TestBox = styled.div`
  width: 100px;
  height: 100px;
  background: red;
  transition: width 2s;

  &:hover {
    width: 300px;
  }
`;

// const DeviceCard = styled.div`
//   width: 100%;
//   background-color: white;
//   border: 1px solid;
//   padding: 1rem;
//   border-radius: 10px;
//   border-color: #e4e6eb;
//   min-height: 8rem;
//   overflow: hidden;
//   transition: height 0.3s ease-in-out;

//   &.expanded {
//     height: auto;
//   }
// `;

const DeviceContainer = styled.div`
  display: flex;
  width: 18rem;
  height: 50rem;
  gap: 1rem;
  flex-direction: column;
`;

const AcControlsSection = styled.div`
  display: flex;
  flex-direction: column;
  // flex-wrap: wrap;
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const Controls = styled.div`
  display: flex;
`;

const StyledSwitch = styled(Switch)`
  && {
    color: blue;

    &:hover {
      background-color: green;
    }

    &.Mui-checked {
      color: blue;
    }

    &.Mui-checked:hover {
      background-color: yellow;
    }
  }
`;

const ShowControlsContainer = styled.div`
  width: 12rem;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  cursor: pointer;
`;


const ShowControlsIcon = styled(FontAwesomeIcon)`
  transition: transform 0.5s ease;

  ${({ rotate }) => rotate && css`transform: rotate(180deg)`}
`;

const ShowControlsText = styled.span`
  margin-left: 10px;
`;

const H2 = styled.p`
  font-size: 1.3rem;
`;

const ShowControls = ({ setOpenControlsCard, openControlsCard }) => {

  const [rotate, setRotate] = useState(false);

  return (
    <ShowControlsContainer
      onClick={() => {
        setOpenControlsCard(!openControlsCard);
        setRotate(!rotate);
      }}
    >
      <ShowControlsIcon
        icon={faChevronDown}
        size="1x"
        rotate={rotate ? 'rotate' : ''}
      />

      <ShowControlsText>
        {`${openControlsCard ? "Hide" : "Show"} Controls`}
      </ShowControlsText>
    </ShowControlsContainer>
  );
};

export const Device = ({ device, onToggleDeviceSwitch, pumpDuration, setPumpDuration }) => {
  const [state, setState] = useState(device.state === "on");
  const [temperature, setTemperature] = useState(24);
  const [openSeccessSnackBar, setOpenSuccessSnackbar] = useState(false);
  const [openFailureSnackBar, setOpenFailureSnackbar] = useState(false);
  const [openControlsCard, setOpenControlsCard] = useState(false);
  const [mode, setMode] = useState(""); 
  const { room_id, device_id, device_name, id } = device;
  const[color,setcolor] = useState("green");
  const isAcDevice = device_name.toLowerCase() === "ac";
  const isHeaterDevice = device_name.toLowerCase() === "heater";
  const isLaundryDevice = device_name.toLowerCase() === "laundry";
  const isPumpDevice = device_name.toLowerCase() === "pump";

  const isWithControls = isAcDevice || isLaundryDevice || isPumpDevice;
  const [motionDetected, setMotionDetected] = useState(false);

  const onUpdateModeValueHandler = (controlId, updatedMode) => {
    // Update the AC mode by sending a request to your Node.js server.
    // Replace this with the actual API call to your server.
    console.log(`Updated mode for device ${controlId}: ${updatedMode}`);
  };

useEffect(() => {
  const fetchAcState = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/sensibo`);
      console.log("Response from /sensibo:", response.data);

      // Directly accessing the properties from response.data
      if (response.data) {
        const { on, mode, targetTemperature, temperatureUnit } = response.data;
        setState(on);
        setMode(mode);
        setTemperature(targetTemperature);
        // If you need to use the temperature unit, you can also set it to state here
        // setTemperatureUnit(temperatureUnit);
      } else {
        // Handle the case where the response doesn't have the expected data
        console.error("Unexpected response structure:", response.data);
      }
    } catch (error) {
      console.error('Error fetching AC state:', error);
      // Handle the error by showing an error message or setting a default state
      // For example, you might want to set default values:
      setState(false);
      setMode('cool'); // Set to your default mode
      setTemperature(24); // Set to your default temperature
    }
  };

  if (isAcDevice) {
    fetchAcState();
  }
}, [isAcDevice]); // SERVER_URL is constant, no need to include in dependencies array

// -----------------------------motion-dected----------------------------------
const fetchMotionState = async () => {
  try {
    const response = await axios.get(`${SERVER_URL}/motion-state`);
    const isMotionDetected = response.data.motionDetected;

    // Only update state and log if the motion detection state has changed
    if (isMotionDetected !== motionDetected) {
      setMotionDetected(isMotionDetected);
      console.log(`Response from /motionDetected: {motionDetected: ${isMotionDetected}}`);
      
      if (isMotionDetected) {
        setOpenSuccessSnackbar(true); // Show success snackbar when motion is detected
      } else {
        setOpenSuccessSnackbar(false); // Optionally hide the snackbar when no motion is detected
      }
    }
  } catch (error) {
    console.error('Error fetching motion state:', error);
    setOpenFailureSnackbar(true); // Show failure snackbar on error
  }
};
useEffect(() => {
  fetchMotionState(); // Initial fetch when component mounts
  const intervalId = setInterval(fetchMotionState, 500); // Continue polling every 5 seconds

  // Cleanup interval on component unmount
  return () => clearInterval(intervalId);
}, [motionDetected]); // Now this effect depends on motionDetected


useEffect(() => {
  if (device.device_name.toLowerCase() === 'light') {
    const lightState = motionDetected ? 'on' : 'off';
    setState(motionDetected);
    setcolor(motionDetected ? "green" : "red");
    // You can also make an API call here if you want to reflect the state change in the backend
  }
}, [motionDetected, device.device_name]);

////////////////////////////////

// -------------------------------------waleed---------------------------------------------
  // const onDeviceChange = async (e) => {
  //   const newState = e.target.checked;
  //   setState(newState);

  //   // If the device is a pump, use SpeechSynthesisUtterance to play an audio message
  //   if (isPumpDevice) {
  //     let msg;

  //     if (newState) { // Pump is turned on
  //       msg = new SpeechSynthesisUtterance("Watering system activated");
  //     } else { // Pump is turned off
  //       msg = new SpeechSynthesisUtterance("Watering system deactivated");
  //     }

  //     window.speechSynthesis.speak(msg);
  //   }

  //   let response;
  //   if (onToggleDeviceSwitch) {
  //     response = await onToggleDeviceSwitch({
  //       state: newState,
  //       id: device.id,
  //       temperature,
  //     });
  //   }
  //   try {
  //     // Assuming SERVER_URL is correctly defined and accessible
  //     const roomDeviceResponse = await axios.put(`${SERVER_URL}/room-devices/`, {
  //       state: newState, 
  //       id // Make sure 'id' is correctly defined and holds the intended value
  //     });
  
  //     // Check if the response was successful (status code 200)
  //     if (roomDeviceResponse.status === 200) {
  //       setOpenSuccessSnackbar(true);
  //     } else {
  //       // If the status code is not 200, consider it a failure
  //       setOpenFailureSnackbar(true);
  //     }
  //   } catch (error) {
  //     // Log the error and show the failure snackbar in case of an exception
  //     console.error('Error updating device state:', error);
  //     setOpenFailureSnackbar(true);
  //   }
  // };
  // const onDeviceChange = async (e) => {
  //   const newState = e.target.checked;
  //   setState(newState);
  
  //   try {
  //     const response = await axios.put(`${SERVER_URL}/room-devices/${device.id}`, {
  //       state: newState ? 'on' : 'off',
  //       temperature: temperature,
  //     });
  
  //     if (response.status === 200) {
  //       setOpenSuccessSnackbar(true);
  //     } else {
  //       setOpenFailureSnackbar(true);
  //     }
  //   } catch (error) {
  //     console.error('Error updating device state:', error);
  //     setOpenFailureSnackbar(true);
  //   }
  
  //   if (isPumpDevice) {
  //     const msg = newState ? "Watering system activated" : "Watering system deactivated";
  //     const speechMsg = new SpeechSynthesisUtterance(msg);
  //     window.speechSynthesis.speak(speechMsg);
  //   }
  // };
  
  const onDeviceChange = async (device, e) => {
    const newState = e.target.checked;
    console.log(device, newState);
    setState(newState); // Update local state immediately for better user feedback
    setcolor(newState ? "green" : "red");
  
    try {
      if (device.device_name.toLowerCase() === 'ac') {
      // Send both turn on/off and temperature update requests in parallel
      const requests = [
        axios.post(`${SERVER_URL}/sensibo`, { state: newState, id: device.id }),
        newState && temperature ? axios.post(`${SERVER_URL}/sensibo`, { temperature, id: device.id }) : null
      ].filter(Boolean); // filter out null if newState is false or temperature is not set

      const results = await Promise.all(requests);

      // Check if all requests were successful
      if (results.every(response => response.status === 200)) {
        setOpenSuccessSnackbar(true);
      } else {
        setOpenFailureSnackbar(true);
      }
      } else if (device.device_name.toLowerCase() === 'light') {
        // If the device is a light, log to the console and possibly toggle its state
        console.log('Light is turn on:', newState ? "ON" : "OFF");
        try {
          const response = await axios.post(`${SERVER_URL}/motion-detected`, {
            state: newState ? 'on' : 'off'
          });
    
          // Check if the request was successful
          if (response.status === 200) {
            console.log(`Light turned ${newState ? "on" : "off"}, request received successfully`);
            setOpenSuccessSnackbar(true);
            // Optionally, update the UI to reflect the new state
          } else {
            setOpenFailureSnackbar(true);
          }
        } catch (error) {
          console.error('Error turning light on/off:', error);
          setOpenFailureSnackbar(true);
        }
      }
  
      // Add additional else if blocks for other device types as needed
  
    } catch (error) {
      console.error('Error updating device state or temperature:', error);
      setOpenFailureSnackbar(true);
    }
  };
  



  const onChangeTemperature = async (newTemperature) => {
    setTemperature(newTemperature); // update the local state optimistically
  
    try {
      // Perform the POST request to the server to update the temperature
      const response = await axios.post(`${SERVER_URL}/sensibo`, {
        state: state,
        temperature: newTemperature,
        id: device.id,
      });
  
      // Check for a successful response
      if (response.status === 200) {
        console.log('Temperature updated successfully');
        // You might not need to set the temperature again if you're optimistic
      } else {
        console.error('Failed to update temperature:', response.status);
        setOpenFailureSnackbar(true);
        // Rollback if necessary
        setTemperature(temperature); // reset to the previous temperature
      }
    } catch (error) {
      console.error('Error updating temperature:', error);
      setOpenFailureSnackbar(true);
      // Rollback if necessary
      setTemperature(temperature); // reset to the previous temperature
    }
  };
  
  

  const handleCloseSnackBar = () => {
    setOpenSuccessSnackbar(false);
    setOpenFailureSnackbar(false);
  };
  
  return (
    <DeviceCard
      height={openControlsCard ? "auto" : "8rem"}
      className={openControlsCard ? "expanded" : ""}
      isLaundryDevice={isLaundryDevice}
    >
      <TopRow>
        <H2>{device_name}</H2>
        <Switch
          onChange={(e) => onDeviceChange(device, e)}
          checked={state}
        />
      </TopRow>
      {openSeccessSnackBar && (
        <SnackBar
          message={`${device.device_name.toUpperCase()} is now ${state ? "ON" : "OFF"
            }`}
          isOpen={true}
          handleCloseSnackBar={handleCloseSnackBar}
          color={color}
        />
      )}


      {isWithControls && (
        <ShowControls
          setOpenControlsCard={setOpenControlsCard}
          openControlsCard={openControlsCard}
          onClick={() => {
            setOpenControlsCard(!openControlsCard);
          }}
        />
      )}

      <ControlContainer isVisible={openControlsCard}>
        {openControlsCard && (isAcDevice ? (
          <AcControls
            temperature={temperature}
            onChangeValue={(value) => onChangeTemperature(value)}
            acState={state}
          />
        ) : isPumpDevice ? (
          <PumpControls
            pumpDuration={pumpDuration}
            setPumpDuration={setPumpDuration}
          />
        ) : (
          <LaundryControls />
        ))}
      </ControlContainer>
    </DeviceCard>
  );
};
