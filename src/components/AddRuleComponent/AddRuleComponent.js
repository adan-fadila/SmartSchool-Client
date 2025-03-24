import React, { useState, useEffect } from 'react';
import classes from './AddRuleComponent.module.scss';
import { toast } from 'react-toastify';
import { SERVER_URL } from '../../consts';

const AddRuleComponent = ({ onSuccess, spaceId, fullName }) => {
  const [availableEvents, setAvailableEvents] = useState([]);
  const [availableActions, setAvailableActions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Rule state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedCondition, setSelectedCondition] = useState('');
  const [conditionValue, setConditionValue] = useState('');
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionState, setActionState] = useState(''); // on/off
  const [actionTemp, setActionTemp] = useState(''); // temperature for AC
  const [actionMode, setActionMode] = useState(''); // heat/cool for AC

  // Preview text
  const [previewText, setPreviewText] = useState('');

  // Fetch available events and actions
  useEffect(() => {
    const fetchData = async () => {
      try {
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
          setAvailableEvents(eventsData.events);
          setAvailableActions(actionsData.actions);
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
  }, []);

  // Update preview text whenever any value changes
  useEffect(() => {
    if (selectedEvent && selectedCondition) {
      let preview = `if ${selectedEvent.location} ${selectedEvent.type} ${selectedCondition} ${conditionValue}`;
      
      if (selectedAction) {
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
      
      setPreviewText(preview);
    }
  }, [selectedEvent, selectedCondition, conditionValue, selectedAction, actionState, actionTemp, actionMode]);

  const getConditionOptions = (eventType) => {
    switch (eventType?.toLowerCase()) {
      case 'temperature':
      case 'humidity':
        return ['>', '<', '=', '>=', '<='];
      case 'motion':
        return ['detected', 'not detected'];
      default:
        return ['=', '!='];
    }
  };

  const handleSubmit = async () => {
    if (!selectedEvent || !selectedAction || !selectedCondition || !actionState) {
      toast.error('Please complete all required fields');
      return;
    }

    try {
      let actionValue = actionState;
      if (selectedAction.type === 'ac' && actionState === 'on') {
        if (actionTemp) actionValue += ` ${actionTemp}`;
        if (actionMode) actionValue += ` ${actionMode}`;
      }

      const ruleData = {
        description: previewText,
        event: `${selectedEvent.name} ${selectedCondition} ${conditionValue}`,
        action: `${selectedAction.name} ${actionValue}`,
        room_id: selectedEvent.room_id,
        space_id: spaceId,
        created_by: fullName || 'User'
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
  };

  if (loading) {
    return <div className={classes.formContainer}>Loading available options...</div>;
  }

  const isNumericCondition = (eventType) => {
    return ['temperature', 'humidity'].includes(eventType?.toLowerCase());
  };

  const canSubmit = () => {
    if (!selectedEvent || !selectedAction || !selectedCondition || !actionState) return false;
    if (selectedAction.type === 'ac' && actionState === 'on' && (!actionTemp || !actionMode)) return false;
    return true;
  };

  return (
    <div className={classes.formContainer}>
      <div className={classes.section}>
        <h4>1. Select Trigger Event</h4>
        <div className={classes.optionsList}>
          {availableEvents.map((event, index) => (
            <div
              key={index}
              className={`${classes.clickableOption} ${selectedEvent?.name === event.name ? classes.activeOptions : ''}`}
              onClick={() => setSelectedEvent(event)}
            >
              {event.location} - {event.type} (Current: {event.currentValue})
            </div>
          ))}
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
            {selectedCondition && (
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
                setSelectedAction(action);
                setActionState('');
                setActionTemp('');
                setActionMode('');
              }}
            >
              {action.location} - {action.name} ({action.type})
            </div>
          ))}
        </div>

        {selectedAction && (
          <div className={classes.actionDetails}>
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
      </div>
    </div>
  );
};

AddRuleComponent.defaultProps = {
  spaceId: '',
  fullName: '',
};

export default AddRuleComponent;
