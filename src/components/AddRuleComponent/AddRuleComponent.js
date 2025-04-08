import React, { useState, useEffect } from 'react';
import classes from './AddRuleComponent.module.scss';
import { toast } from 'react-toastify';
import axios from 'axios';
import { SERVER_URL } from '../../consts';
import { useSpace } from '../../contexts/SpaceContext';

const AddRuleComponent = ({ onSuccess, spaceId, fullName }) => {
  const [availableEvents, setAvailableEvents] = useState([]);
  const [availableActions, setAvailableActions] = useState([]);
  const [availableAnomalies, setAvailableAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const { spaceId: contextSpaceId } = useSpace();
  const effectiveSpaceId = spaceId || contextSpaceId;
  
  // Rule state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedCondition, setSelectedCondition] = useState('');
  const [conditionValue, setConditionValue] = useState('');
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionState, setActionState] = useState(''); // on/off
  const [actionTemp, setActionTemp] = useState(''); // temperature for AC
  const [actionMode, setActionMode] = useState(''); // heat/cool for AC
  const [phoneNumber, setPhoneNumber] = useState(''); // phone number for SMS notifications

  // Preview text
  const [previewText, setPreviewText] = useState('');

  // Fetch available events, actions, and anomalies
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log(`Fetching anomaly descriptions for space ID: ${effectiveSpaceId}`);
        
        // Define the anomaly descriptions map
        let anomalyDescriptions = {};
        let rawAnomalyData = [];
        
        // First fetch anomaly descriptions using axios with the correct endpoint
        try {
          const anomalyResponse = await axios.get(`${SERVER_URL}/api/anomaly-descriptions/space/${effectiveSpaceId}`);
          
          console.log("Raw anomaly descriptions API response:", anomalyResponse.data);
          
          // Process the anomaly descriptions
          if (anomalyResponse.data && anomalyResponse.data.success && Array.isArray(anomalyResponse.data.data)) {
            // Extract the data array from the response
            rawAnomalyData = anomalyResponse.data.data;
            
            // Create a map for looking up descriptions
            rawAnomalyData.forEach(item => {
              if (item && item.rawEventName) {
                // Store the description keyed by rawEventName
                anomalyDescriptions[item.rawEventName.toLowerCase()] = item.description || '';
                
                // Also store by location for simpler matching
                if (item.location) {
                  anomalyDescriptions[`${item.location.toLowerCase()} anomaly`] = item.description || '';
                }
              }
            });
            
            console.log("Processed anomaly descriptions:", anomalyDescriptions);
          } else if (anomalyResponse.data && !anomalyResponse.data.success) {
            console.warn("API returned success: false", anomalyResponse.data);
          }
        } catch (anomalyError) {
          console.error("Error fetching anomaly descriptions:", anomalyError);
        }
        
        // Then fetch events and actions using the existing approach
        const [eventsResponse, actionsResponse] = await Promise.all([
          fetch(`${SERVER_URL}/api-events/available`),
          fetch(`${SERVER_URL}/api-actions/available`)
        ]);

        if (!eventsResponse.ok || !actionsResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const eventsData = await eventsResponse.json();
        const actionsData = await actionsResponse.json();

        if (eventsData.success && actionsData.success) {
          // Separate regular events and anomaly events
          const regularEvents = eventsData.events.filter(event => !event.type?.includes('anomaly'));
          const anomalyEvents = eventsData.events.filter(event => event.type?.includes('anomaly'));
          
          // Log the anomaly events for debugging
          console.log("Anomaly events from API:", anomalyEvents);
          
          setAvailableEvents(regularEvents);
          setAvailableActions(actionsData.actions);
          
          // Use the raw anomaly data directly if possible, otherwise transform
          let formattedAnomalies;
          
          if (rawAnomalyData.length > 0) {
            // If we got anomaly descriptions from the API, use them directly
            formattedAnomalies = rawAnomalyData.map(anomaly => {
              return {
                // Use only the description for display
                name: anomaly.description,
                // Keep original data for reference
                originalName: anomaly.rawEventName,
                location: anomaly.location,
                type: 'anomaly',
                subType: anomaly.anomalyType,
                metricType: anomaly.metricType,
                currentValue: { detected: anomaly.isActive || false },
                room_id: anomaly.roomId
              };
            });
            console.log("Using direct anomaly data from API:", formattedAnomalies);
          } else {
            // Do nothing - don't show any anomalies if we don't have descriptions
            formattedAnomalies = [];
          }
          
          setAvailableAnomalies(formattedAnomalies);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load available events and actions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [effectiveSpaceId]);

  // Update preview text whenever any value changes
  useEffect(() => {
    if (selectedEvent && selectedCondition) {
      let preview = '';
      
      // For anomalies, use the description (name) directly
      if (selectedEvent.type === 'anomaly') {
        preview = `if ${selectedEvent.name} ${selectedCondition}`;
      } else {
        preview = `if ${selectedEvent.location} ${selectedEvent.type} ${selectedCondition}`;
        if (conditionValue) {
          preview += ` ${conditionValue}`;
        }
      }
      
      if (selectedAction) {
        console.log("Selected action for preview:", selectedAction);
        
        // Check if this is the SMS notification service by type
        if (selectedAction.type === 'sms') {
          console.log("SMS action detected for preview");
          if (phoneNumber) {
            preview += ` then send sms to ${phoneNumber}`;
          } else {
            preview += ` then send sms to [Enter phone number]`;
          }
        } else {
          let actionName = selectedAction.name;
          if (actionName.startsWith(selectedAction.location)) {
            actionName = actionName.substring(selectedAction.location.length).trim();
          }
          
          let actionText = `${selectedAction.location} ${actionName}`;
          if (selectedAction.type === 'ac') {
            if (actionState) {
              actionText += ` ${actionState}`;
              if (actionTemp) {
                actionText += ` ${actionTemp}`;
              }
              if (actionMode) {
                actionText += ` ${actionMode}`;
              }
            }
          } else {
            if (actionState) {
              actionText += ` ${actionState}`;
            }
          }
          preview += ` then ${actionText}`;
        }
      }
      
      setPreviewText(preview);
    }
  }, [selectedEvent, selectedCondition, conditionValue, selectedAction, actionState, actionTemp, actionMode, phoneNumber]);

  const getConditionOptions = (eventType) => {
    switch (eventType?.toLowerCase()) {
      case 'temperature':
      case 'humidity':
        return ['>', '<', '=', '>=', '<='];
      case 'motion':
        return ['detected', 'not detected'];
      case 'anomaly':
        return ['detected', 'not detected'];
      default:
        return ['=', '!='];
    }
  };

  const handleSubmit = async () => {
    if (!selectedEvent || !selectedAction || !selectedCondition) {
      toast.error('Please complete all required fields');
      return;
    }

    // Check if this is the SMS notification service by type
    const isSmsNotification = selectedAction.type === 'sms';

    // Additional validation for specific action types
    if (!isSmsNotification && selectedAction.type === 'ac' && actionState === 'on' && (!actionTemp || !actionMode)) {
      toast.error('Please complete AC settings');
      return;
    }

    if (isSmsNotification && !phoneNumber) {
      toast.error('Please enter a phone number for SMS notification');
      return;
    }

    try {
      let actionValue = actionState;
      let isNotificationRule = false;
      let notificationPhoneNumber = null;
      let notificationMessage = null;
      let actionString = '';

      // Handle SMS notification action differently
      if (isSmsNotification) {
        console.log("Processing SMS notification rule");
        isNotificationRule = true;
        notificationPhoneNumber = phoneNumber;
        
        // For anomalies, use the full name as the message
        if (selectedEvent.type === 'anomaly') {
          notificationMessage = `${selectedEvent.name} ${selectedCondition}`;
        } else {
          // For regular events, format the message using event details
          notificationMessage = `${selectedEvent.location} ${selectedEvent.type} ${selectedCondition} ${conditionValue}`.trim();
        }
        
        actionString = `send sms to ${phoneNumber}`;
      } else if (selectedAction.type === 'ac' && actionState === 'on') {
        if (actionTemp) actionValue += ` ${actionTemp}`;
        if (actionMode) actionValue += ` ${actionMode}`;
        actionString = `${selectedAction.name} ${actionValue}`;
      } else {
        actionString = `${selectedAction.name} ${actionValue}`;
      }

      // For anomalies, we'll use the description (name) for display, but
      // we need to ensure the backend gets the proper information
      const eventString = selectedEvent.type === 'anomaly' 
        ? `${selectedEvent.originalName || selectedEvent.name} ${selectedCondition}`
        : `${selectedEvent.name} ${selectedCondition} ${conditionValue}`;

      // Determine room_id for the rule
      let ruleRoomId = selectedEvent.room_id;
      
      // If room_id is not available directly (especially for anomalies)
      if (!ruleRoomId && selectedEvent.location) {
        try {
          const roomResponse = await fetch(`${SERVER_URL}/api-room/rooms/space/${effectiveSpaceId}`);
          if (roomResponse.ok) {
            const roomsData = await roomResponse.json();
            const room = roomsData.find(r => 
              r.name.toLowerCase() === selectedEvent.location.toLowerCase()
            );
            
            if (room) {
              ruleRoomId = room.id;
            }
          }
        } catch (roomError) {
          console.error('Error fetching room:', roomError);
        }
      }

      // Generate the rule description based on the action type
      let ruleDescription = '';
      if (isNotificationRule) {
        ruleDescription = `if ${notificationMessage} then send sms to ${notificationPhoneNumber}`;
      } else {
        ruleDescription = previewText;
      }

      const ruleData = {
        description: ruleDescription,
        event: eventString,
        action: actionString,
        room_id: ruleRoomId,
        space_id: effectiveSpaceId,
        created_by: fullName || 'User',
        isNotificationRule: isNotificationRule,
        notificationPhoneNumber: notificationPhoneNumber,
        notificationMessage: notificationMessage
      };

      const response = await fetch(`${SERVER_URL}/api-rule/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      });

      if (response.ok) {
        toast.success('Rule added successfully!');
        resetForm();
        if (onSuccess) onSuccess();
      } else {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to add rule');
      }
    } catch (error) {
      console.error('Error adding rule:', error);
      toast.error(`Failed to add the rule: ${error.message}`);
    }
  };

  const resetForm = () => {
    setSelectedEvent(null);
    setSelectedCondition('');
    setConditionValue('');
    setSelectedAction(null);
    setActionState('');
    setActionTemp('');
    setActionMode('');
    setPhoneNumber('');
  };

  if (loading) {
    return <div className={classes.formContainer}>Loading available options...</div>;
  }

  const isNumericCondition = (eventType) => {
    return ['temperature', 'humidity'].includes(eventType?.toLowerCase());
  };

  const canSubmit = () => {
    if (!selectedEvent || !selectedAction || !selectedCondition) return false;
    
    // Check if this is the SMS notification service by type
    const isSmsNotification = selectedAction.type === 'sms';
    
    if (isSmsNotification) {
      return phoneNumber.trim() !== '';
    }
    
    if (selectedAction.type === 'ac' && actionState === 'on' && (!actionTemp || !actionMode)) return false;
    
    return actionState !== '';
  };

  return (
    <div className={classes.formContainer}>
      <div className={classes.section}>
        <h4>1. Select Trigger Event</h4>
        
        <div className={classes.availableOptionsContainer}>
          <div className={classes.availableOptions}>
            <h4>Regular Events</h4>
            <div className={classes.optionsList}>
              {availableEvents.map((event, index) => (
                <div
                  key={`event-${index}`}
                  className={`${classes.clickableOption} ${selectedEvent?.name === event.name ? classes.activeOptions : ''}`}
                  onClick={() => setSelectedEvent(event)}
                >
                  {event.location} - {event.type} (Current: {String(event.currentValue)})
                </div>
              ))}
            </div>
          </div>
          
          <div className={classes.availableOptions}>
            <h4>Anomaly Events</h4>
            <div className={classes.optionsList}>
              {availableAnomalies.map((anomaly, index) => (
                <div
                  key={`anomaly-${index}`}
                  className={`${classes.clickableOption} ${selectedEvent?.name === anomaly.name ? classes.activeOptions : ''}`}
                  onClick={() => setSelectedEvent(anomaly)}
                >
                  {anomaly.name}
                </div>
              ))}
              {availableAnomalies.length === 0 && (
                <div className={classes.noOptions}>No anomaly events available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <div className={classes.section}>
          <h4>2. Set Condition</h4>
          <div className={classes.conditionContainer}>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className={classes.inputColumn}
            >
              <option value="">Select condition</option>
              {getConditionOptions(selectedEvent?.type).map((condition) => (
                <option key={condition} value={condition}>{condition}</option>
              ))}
            </select>
            {selectedCondition && selectedEvent.type !== 'anomaly' && (
              <input
                type={isNumericCondition(selectedEvent?.type) ? "number" : "text"}
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder="Enter value"
                className={classes.inputColumn}
              />
            )}
          </div>
        </div>
      )}

      <div className={classes.section}>
        <h4>3. Select Action</h4>
        <div className={classes.optionsList}>
          {availableActions.map((action, index) => (
            <div
              key={index}
              className={`${classes.clickableOption} ${selectedAction?.name === action.name ? classes.activeOptions : ''}`}
              onClick={() => {
                console.log("Selected action:", action);
                setSelectedAction(action);
                setActionState('');
                setActionTemp('');
                setActionMode('');
                setPhoneNumber('');
              }}
            >
              {action.location} - {action.name} ({action.type})
            </div>
          ))}
        </div>

        {selectedAction && (
          <div className={classes.actionDetails}>
            {/* Log the action name and check for SMS */}
            {console.log("Rendering action details for:", selectedAction.name, "Type:", selectedAction.type, "Is SMS?", selectedAction.type === 'sms')}
            
            {selectedAction.type === 'sms' ? (
              <>
                <label>Enter phone number for SMS notification:</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter phone number (e.g., +1234567890)"
                  className={classes.inputColumn}
                />
              </>
            ) : (
              <>
                <select
                  value={actionState}
                  onChange={(e) => setActionState(e.target.value)}
                  className={classes.inputColumn}
                >
                  <option value="">Select state</option>
                  <option value="on">On</option>
                  <option value="off">Off</option>
                </select>

                {selectedAction.type === 'ac' && actionState === 'on' && (
                  <>
                    <input
                      type="number"
                      value={actionTemp}
                      onChange={(e) => setActionTemp(e.target.value)}
                      placeholder="Temperature"
                      className={classes.inputColumn}
                    />
                    <select
                      value={actionMode}
                      onChange={(e) => setActionMode(e.target.value)}
                      className={classes.inputColumn}
                    >
                      <option value="">Select mode</option>
                      <option value="cool">Cool</option>
                      <option value="heat">Heat</option>
                      <option value="fan">Fan</option>
                      <option value="dry">Dry</option>
                      <option value="automatic">Automatic</option>
                    </select>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className={classes.rulePreview}>
        <h4>Rule Preview:</h4>
        <div className={classes.previewText}>{previewText || 'Build your rule using the options above'}</div>
      </div>

      <button
        className={classes.submitButton}
        onClick={handleSubmit}
        disabled={!canSubmit()}
      >
        Create Rule
      </button>

      <div className={classes.hint}>
        <p>Format examples:</p>
        <p>- if Living Room Temperature {'>'} 26 then Living Room AC on</p>
        <p>- if Living Room Temperature {'>'} 10 then Living Room AC on 20 heat</p>
        <p>- if Kitchen Motion detected then Kitchen Light on</p>
        <p>- if living room temperature pointwise anomaly detected then Living Room Light on</p>
        <p>- if Server Room Temperature {'>'} 28 then send sms to +1234567890</p>
      </div>
    </div>
  );
};

AddRuleComponent.defaultProps = {
  spaceId: '',
  fullName: '',
};

export default AddRuleComponent;
