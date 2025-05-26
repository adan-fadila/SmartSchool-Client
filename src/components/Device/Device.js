import React, { useEffect, useState } from "react";
import styled, { css } from "styled-components";
import { SnackBar } from "../Snackbar/SnackBar";
import Switch from "../UI/Switch/Switch";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faLightbulb } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { SERVER_URL } from "../../consts";
import { AcControls } from "./Controls/CustomControls/AcControls";
import { LaundryControls } from "./Controls/CustomControls/LaundryControls";
import { PumpControls } from "./Controls/CustomControls/PumpControls";

// Styled component for sensor value placeholder
const SensorValuePlaceholder = styled.span`
  font-size: 1.2rem; // Adjust size as needed
  font-weight: bold;
  color: #555; // Adjust color as needed
  margin-right: 10px; // Align roughly where the switch was
`;

const DeviceCard = styled.div`
  position: relative; /* Added for absolute positioning of the anomaly indicator */
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

  @media (max-width: 768px) { /* Tablet view */
  width: 18rem;
  min-width: 18rem
  min-height: 7rem;
  height: 7rem;
}

  @media (max-width: 480px) { /* Mobile view */
  // width: 16rem;
  // min-width: 16rem;
    min-height: 7rem;
    height: 7rem;

  }
`;

const ControlContainer = styled.div`
  transition: opacity 0.4s ease-in-out;
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    /* Tablet view */
    margin-bottom: 0rem;
  }

  @media (max-width: 480px) {
    /* Mobile view */
    margin-bottom: 0rem;
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

  ${({ rotate }) =>
    rotate &&
    css`
      transform: rotate(180deg);
    `}
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
        rotate={rotate ? "rotate" : ""}
      />

      <ShowControlsText>
        {`${openControlsCard ? "Hide" : "Show"} Controls`}
      </ShowControlsText>
    </ShowControlsContainer>
  );
};

// Add styled component for anomaly indicator
const AnomalyIndicator = styled.div`
  position: absolute;
  top: -10px;
  right: -10px;
  z-index: 1;
  cursor: pointer;
`;

const FlickeringIcon = styled(FontAwesomeIcon)`
  color: #ffd700;
  font-size: 1.5rem;
  animation: flicker 1s infinite;

  @keyframes flicker {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

export const Device = ({
  device,
  onToggleDeviceSwitch,
  pumpDuration,
  setPumpDuration,
  spaceId,
  isRpiSensor,
  hasAnomaly,
  onAnomalyClick,
}) => {
  const [state, setState] = useState(device.state === "on");
  const [temperature, setTemperature] = useState(24);
  const [sensorValue, setSensorValue] = useState("--"); // State for fetched sensor value
  const [openSeccessSnackBar, setOpenSuccessSnackbar] = useState(false);
  const [openFailureSnackBar, setOpenFailureSnackbar] = useState(false);
  const [openControlsCard, setOpenControlsCard] = useState(false);
  const [mode, setMode] = useState("cool");
  const { room_id, device_id, device_name, id } = device;
  const [color, setcolor] = useState("green");
  const isAcDevice = device_name.toLowerCase() === "ac";
  const isHeaterDevice = device_name.toLowerCase() === "heater";
  const isLaundryDevice = device_name.toLowerCase() === "laundry";
  const isPumpDevice = device_name.toLowerCase() === "pump";
  const isTapDevice = device_name.toLowerCase === "tap";
  const [temperatureUnit, setTemperatureUnit] = useState("C"); // Default to Celsius
  const [raspberryPiIP, setRaspberryPiIP] = useState("");
  const isWithControls = isAcDevice || isLaundryDevice || isPumpDevice;
  const [motionDetected, setMotionDetected] = useState(false);
  const [roomIDState, setRoomIDState] = useState("");
  const [deviceIDState, setDeviceIDState] = useState("");
  const [spaceIDState, setSpaceIDState] = useState("");
  const onUpdateModeValueHandler = (newMode) => {
    setMode(newMode);

    if (isAcDevice && onToggleDeviceSwitch) {
      onToggleDeviceSwitch({
        state: state,
        temperature: temperature,
        mode: newMode,
        id: device_id,
      });
    } else {
      console.error("No toggle function provided for mode change");
    }
  };

  const fetchRaspberryPiIP = async (spaceId) => {
    try {
      const response = await axios.get(
        `${SERVER_URL}/api-space/spaces/${spaceId}`
      );
      if (response.data && response.data.data) {
        // Check if response.data and response.data.data objects exist
        setRaspberryPiIP(response.data.data.rasp_ip); // Store the IP in state
        return response.data.data.rasp_ip; // Access the rasp_ip from within the nested data object
      }
      console.error("Raspberry Pi IP not found in response:", response.data);
      setRaspberryPiIP(""); // Clear state if no IP found
      return null; // Return null if rasp_ip is not found
    } catch (error) {
      console.error("Failed to fetch Raspberry Pi IP:", error);
      setRaspberryPiIP("");
      return null; // Return null and handle the error as appropriate
    }
  };

  useEffect(() => {
    if (spaceId) {
      fetchRaspberryPiIP(spaceId);
    }
  }, [spaceId]);

  useEffect(() => {
    const fetchAcState = async () => {
      if (!raspberryPiIP || !device_id) {
        console.error("Raspberry Pi IP address or Device ID is missing.");
        return;
      }
      console.log("Ras_IP: " + raspberryPiIP, "device_id: " + device_id);
      try {
        const response = await axios.get(
          `${SERVER_URL}/api-sensors/sensibo?rasp_ip=${encodeURIComponent(
            raspberryPiIP
          )}&device_id=${encodeURIComponent(device_id)}`
        );
        if (response.data?.mode) {
          const { on, mode, targetTemperature, temperatureUnit } =
            response.data;
          setState(on);
          setMode(mode);
          setTemperature(targetTemperature);
        } else {
          throw new Error("Unexpected response structure or missing data");
        }
      } catch (error) {
        console.error("Error fetching AC state:", error);
        setState(false);
        setMode("cool");
        setTemperature(24);
        if (error.response && error.response.status === 500) {
          console.error("Server error:", error.response.data);
        }
      }
    };
    if (isAcDevice && raspberryPiIP && device_id) {
      fetchAcState();
    }
  }, [isAcDevice, raspberryPiIP, device_id]); // Ensure to listen to changes in raspberryPiIP as well

  // -----------------------------motion-dected----------------------------------
  useEffect(() => {
    const fetchMotionState = async () => {
      try {
        const response = await axios.get(
          `${SERVER_URL}/api-sensors/motion-state`
        );
        // const { isMotionDetected, ROOM_ID, SPACE_ID, DEVICE_ID } = response.data;
        const isMotionDetected = response.data.motionDetected;
        const ROOM_ID = response.data.ROOM_ID;
        const DEVICE_ID = response.data.DEVICE_ID;
        const SPACE_ID = response.data.SPACE_ID;
        if (isMotionDetected !== motionDetected) {
          setMotionDetected(isMotionDetected);
        }
        if (ROOM_ID !== roomIDState) {
          setRoomIDState(ROOM_ID);
        }
        if (DEVICE_ID !== deviceIDState) {
          setDeviceIDState(DEVICE_ID);
        }
        if (SPACE_ID !== spaceIDState) {
          setSpaceIDState(SPACE_ID);
        }
      } catch (error) {
        console.error("Error fetching motion state:", error);
        setOpenFailureSnackbar(true); // Generic failure notification
      }
    };
    const intervalId = setInterval(fetchMotionState, 2000);
    return () => clearInterval(intervalId);
  }, [motionDetected, roomIDState, deviceIDState, spaceIDState]);

  useEffect(() => {
    if (
      device.device_name.toLowerCase() === "light" &&
      device.device_id === deviceIDState
    ) {
      const lightState = motionDetected ? "on" : "off";
      setState(motionDetected);
      setcolor(motionDetected ? "green" : "red");

      if (motionDetected) {
        setOpenSuccessSnackbar(true);
        setOpenFailureSnackbar(false); // Ensure to hide failure snackbar when motion is detected
      } else {
        // Failure snackbar for no motion detected and light turned off
        setOpenSuccessSnackbar(false);
        setOpenFailureSnackbar(true);
      }
    }
  }, [motionDetected, device.device_name, device.device_id, deviceIDState]);

  // Effect to fetch sensor data for RPi sensors
  useEffect(() => {
    let intervalId = null;

    const fetchSensorData = async () => {
      if (isRpiSensor && raspberryPiIP && device.device_type) {
        console.log(`Fetching ${device.device_type} from ${raspberryPiIP}`);
        try {
          // Assuming this endpoint returns both temp & humidity
          const response = await axios.get(
            `${SERVER_URL}/api-sensors/temperature?rasp_pi=${encodeURIComponent(
              raspberryPiIP
            )}`
          );
          const data = response.data;

          // Extract the relevant value based on the sensor type
          let value = data[device.device_type];

          if (value !== undefined) {
            // Add units based on type
            if (device.device_type === "temperature") {
              value = `${value.toFixed(1)} °C`; // Assuming Celsius
            } else if (device.device_type === "humidity") {
              value = `${value.toFixed(1)} %`;
            } else {
              // Handle other potential sensor types if needed
              value = value.toString();
            }
            setSensorValue(value);
          } else {
            console.warn(
              `Value for ${device.device_type} not found in response:`,
              data
            );
            setSensorValue("N/A");
          }
        } catch (error) {
          console.error(
            `Error fetching sensor data for ${device.device_type}:`,
            error
          );
          setSensorValue("Error");
        }
      }
    };

    if (isRpiSensor && raspberryPiIP) {
      fetchSensorData(); // Fetch immediately
      // Set up polling every 10 seconds (adjust interval as needed)
      intervalId = setInterval(fetchSensorData, 10000);
    }

    // Cleanup function to clear the interval when the component unmounts or dependencies change
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRpiSensor, raspberryPiIP, device.device_type]); // Re-run if these change

  // Updated onDeviceChange function for the Device component

  const onDeviceChange = async (device, e, spaceId, device_id) => {
    const newState = e.target.checked;
    setState(newState);
    setcolor(newState ? "green" : "red");

    try {
      const raspberryPiIP = await fetchRaspberryPiIP(spaceId);
      if (!raspberryPiIP) {
        console.error("No IP found for the given space ID:", spaceId);
        setOpenFailureSnackbar(true);
        return;
      }

      // Handle different device types
      if (device.device_name.toLowerCase() === "ac") {
        console.log("ac togggllllleeeedddd");
        // AC device handling
        if (onToggleDeviceSwitch) {
          try {
            await onToggleDeviceSwitch({
              state: newState,
              temperature: temperature,
              mode: mode,
              id: device_id,
            });
            setOpenSuccessSnackbar(true);
          } catch (error) {
            console.error("Error toggling AC:", error);
            setOpenFailureSnackbar(true);
          }
        } else {
          console.error("No toggle function provided for AC device");
          setOpenFailureSnackbar(true);
        }
      } else if (device.device_name.toLowerCase() === "light") {
        console.log("light clickkkkkkkkkkkkkkkkkkkkkkkkkeeeeeeddd");
        console.log("device id is  : ",device_id);
        // Light device handling
        try {
          const lightPayload = {
            id: device_id,
            rasp_ip: raspberryPiIP,
            state: newState ? "true" : "false",
          };

          console.log(
            "Sending light toggle request with payload:",
            lightPayload
          );

          // Use the new API endpoint for lights
          const response = await axios.put(
            `${SERVER_URL}/api/lights/switch`,
            lightPayload
          );

          if (response.data.success) {
            console.log("Light toggled successfully:", response.data);
            setOpenSuccessSnackbar(true);
          } else {
            console.error("Unexpected response when toggling light:", response);
            setOpenFailureSnackbar(true);
          }
        } catch (error) {
          console.error("Error toggling light:", error.response?.data || error);
          setOpenFailureSnackbar(true);
        }
      }
      // Add handling for other device types here if needed
      else {
        // Generic device handling for other devices
        try {
          const genericPayload = {
            state: newState ? "on" : "off",
            deviceId: device_id,
            rasp_ip: raspberryPiIP,
          };

          const response = await axios.post(
            `${SERVER_URL}/api-sensors/action`,
            genericPayload
          );

          if (response.status === 200) {
            console.log(
              `${device.device_name} toggled successfully:`,
              response.data
            );
            setOpenSuccessSnackbar(true);
          } else {
            console.error(
              `Unexpected response when toggling ${device.device_name}:`,
              response
            );
            setOpenFailureSnackbar(true);
          }
        } catch (error) {
          console.error(`Error toggling ${device.device_name}:`, error);
          setOpenFailureSnackbar(true);
        }
      }
    } catch (error) {
      console.error("Error updating device state:", error);
      setOpenFailureSnackbar(true);
    }
  };

  const onChangeTemperature = async (newTemperature, spaceId, device_id) => {
    setTemperature(newTemperature); // update the local state optimistically

    try {
      const raspberryPiIP = await fetchRaspberryPiIP(spaceId);
      if (!raspberryPiIP) {
        console.error("No IP found for the given space ID:", spaceId);
        setOpenFailureSnackbar(true);
        setTemperature(temperature); // Reset to previous temperature
        return;
      }

      if (isAcDevice && onToggleDeviceSwitch) {
        try {
          await onToggleDeviceSwitch({
            state: state,
            temperature: newTemperature,
            mode: mode,
            id: device_id,
          });
          setOpenSuccessSnackbar(true);
        } catch (error) {
          console.error("Error changing temperature:", error);
          setOpenFailureSnackbar(true);
          setTemperature(temperature); // reset to the previous temperature
        }
      } else {
        console.error("No toggle function provided for temperature change");
        setOpenFailureSnackbar(true);
        setTemperature(temperature); // reset to the previous temperature
      }
    } catch (error) {
      console.error("Error updating temperature:", error);
      setOpenFailureSnackbar(true);
      setTemperature(temperature); // reset to the previous temperature
    }
  };

  const handleCloseSnackBar = () => {
    setOpenSuccessSnackbar(false);
    setOpenFailureSnackbar(false);
  };

  return (
    <DeviceCard
      color={color}
      height={isWithControls ? "8rem" : "7rem"}
      className={openControlsCard ? "expanded" : ""}
      isLaundryDevice={isLaundryDevice}
    >
      {hasAnomaly && (
        <AnomalyIndicator onClick={onAnomalyClick}>
          <FlickeringIcon icon={faLightbulb} />
        </AnomalyIndicator>
      )}

      <TopRow>
        <H2>{device_name}</H2>

        {/* Only show switch for non-sensor devices that can be controlled */}
        {!isRpiSensor ? (
          // Fix for the Switch component - Don't disable the switch for light devices
          <Switch
            checked={state}
            id={device_id}
            onChange={() =>
              onDeviceChange(
                device,
                { target: { checked: !state } },
                spaceId,
                device_id
              )
            }
            // Only disable for AC devices that require onToggleDeviceSwitch
            disabled={
              device.device_name.toLowerCase() === "ac" && !onToggleDeviceSwitch
            }
          />
        ) : (
          <SensorValuePlaceholder>{sensorValue}</SensorValuePlaceholder>
        )}
      </TopRow>
      {openSeccessSnackBar && (
        <SnackBar
          message={`${device.device_name.toUpperCase()} is now ${
            state ? "ON" : "OFF"
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
        {openControlsCard &&
          (isAcDevice ? (
            <AcControls
              temperature={temperature}
              onChangeValue={(value) =>
                onChangeTemperature(value, spaceId, device_id)
              }
              acState={state}
              device_id={device_id}
              raspberryPiIP={raspberryPiIP}
              onModeChange={onUpdateModeValueHandler}
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
