const mongoose = require('mongoose');
const RoomDevice = mongoose.model('room-devices'); // Use the model name from your schema

const setRoomDeviceState = async (device_id, state) => {
  try {
    console.log("Service attempting to update device:", { device_id, state });
    
    // First check if the device exists
    const device = await RoomDevice.findOne({ device_id });
    console.log("Database lookup result:", device);

    if (!device) {
      console.error("No device found with id:", device_id);
      return {
        statusCode: 404,
        message: `No device found with id: ${device_id}`
      };
    }

    // Convert the state value to the correct format
    const stateValue = (typeof state === 'boolean') ? (state ? 'on' : 'off') : state;
    
    console.log("Attempting update with values:", {
      device_id,
      stateValue,
      currentState: device.state
    });

    const response = await RoomDevice.updateOne(
      { device_id },
      { 
        $set: { 
          state: stateValue,
          lastUpdated: new Date()
        } 
      }
    );
    
    console.log("MongoDB update response:", response);

    if (response.matchedCount === 0) {
      console.error("No document matched the query");
      return {
        statusCode: 404,
        message: "Device not found"
      };
    }

    // Fetch and return the updated device
    const updatedDevice = await RoomDevice.findOne({ device_id });
    console.log("Updated device:", updatedDevice);

    return {
      statusCode: 200,
      message: "Room device has been updated",
      device: updatedDevice
    };

  } catch (err) {
    console.error("Service error details:", {
      error: err,
      message: err.message,
      stack: err.stack
    });
    return {
      statusCode: 500,
      message: err.message || "Internal server error"
    };
  }
};

module.exports = {
  setRoomDeviceState
}; 