import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import '@fortawesome/fontawesome-free/css/all.min.css';
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import { RuleSwitch } from "../UI/Switch/RuleSwitch";
import RulesModal from "../../components/RulesModal/RulesModal";
import AddRuleComponent from '../../components/AddRuleComponent/AddRuleComponent';
import classes from "./RulesTable.module.scss";
import {
  TableStyled,
  ThStyled,
  TitleStyled,
  TableContainer
} from "../Suggestions/suggestions.styles";
import { ActionContainer, ActionTdStyled, ActiveCellStyled, Circle, RuleCell, TrStyled } from "./rules.styles";
import { SERVER_URL } from "../../consts";
import { useSpace } from '../../contexts/SpaceContext';
import UserContext from "../../contexts/UserContext";

const RulesTable = ({ rules, onRuleClick, selectedRule, fetchRules }) => {
  const [currentRules, setCurrentRules] = useState(rules);
  const [editRuleId, setEditRuleId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [openAddRuleModal, setOpenAddRuleModal] = useState(false);
  const { spaceId } = useSpace();
  const { user } = useContext(UserContext);
  const fullName = user?.fullName || "";

  useEffect(() => {
    setCurrentRules(rules);
  }, [rules]);

  const handleEditClick = (rule) => {
    setEditRuleId(rule.id);
    setEditValue(rule.description);
  };

  const handleEditChange = (event) => {
    setEditValue(event.target.value);
  };

  const handleSaveEdit = async (ruleId) => {
    try {
      // Parse the edited rule text
      const ruleParts = editValue.toLowerCase().split('then');
      
      if (ruleParts.length !== 2) {
        toast.error('Rule must contain "then" to separate event and action');
        return;
      }
      
      // Extract event (remove 'if' at the beginning if present)
      let event = ruleParts[0].trim();
      if (event.startsWith('if ')) {
        event = event.substring(3).trim();
      }
      
      // Extract action
      const action = ruleParts[1].trim();
      
      // Check if this is an SMS notification rule
      const isSmsRule = action.includes('send sms to');
      let notificationPhoneNumber = null;
      let notificationMessage = null;
      
      if (isSmsRule) {
        // Extract phone number from action
        const phoneMatch = action.match(/send sms to\s+(\+?\d+)/i);
        if (phoneMatch && phoneMatch[1]) {
          notificationPhoneNumber = phoneMatch[1];
          notificationMessage = event; // The event part becomes the notification message
        } else {
          toast.error('Invalid phone number format for SMS notification');
          return;
        }
        
        // For SMS rules, we don't need to extract room info
        // Prepare the updated rule data specifically for SMS notification
        const updatedRuleData = {
          description: editValue,
          event: event,
          action: action,
          isNotificationRule: true,
          notificationPhoneNumber: notificationPhoneNumber,
          notificationMessage: notificationMessage
        };

        const response = await axios.put(`${SERVER_URL}/api-rule/rules/${ruleId}`, updatedRuleData);
        if (response.status === 200) {
          toast.success("Rule updated successfully!");
          const updatedRules = currentRules.map(rule => 
            rule.id === ruleId ? { 
              ...rule, 
              description: editValue,
              event: event,
              action: action,
              isNotificationRule: true,
              notificationPhoneNumber: notificationPhoneNumber,
              notificationMessage: notificationMessage
            } : rule
          );
          setCurrentRules(updatedRules);
          setEditRuleId(null);
        } else {
          toast.error("Failed to update rule.");
        }
        return;
      }
      
      // If it's a regular rule (not SMS), continue with the existing logic
      // Extract room name from the event part (new format: "if [room name] [sensor]")
      let roomName = '';
      
      // Match pattern like: "living room temperature" or "bedroom motion"
      const eventRoomRegex = /^(.*?)\s+(temperature|humidity|motion|light)/i;
      const eventRoomMatch = event.match(eventRoomRegex);
      
      if (eventRoomMatch && eventRoomMatch[1]) {
        roomName = eventRoomMatch[1].trim();
      }
      
      if (!roomName) {
        toast.error('Could not extract room name from the rule. Please use format: "if [room name] [sensor] then [room name] [device] [state]"');
        return;
      }
      
      // Verify that the same room name is used in the action part
      const actionRoomRegex = new RegExp(roomName + '\\s+(ac|light|fan|heater|tv)', 'i');
      const actionRoomMatch = action.match(actionRoomRegex);
      
      if (!actionRoomMatch) {
        toast.error(`Room name "${roomName}" from event part must also be used in action part. Please use format: "if ${roomName} [sensor] then ${roomName} [device] [state]"`);
        return;
      }
      
      // Find the room ID based on the room name
      const rule = currentRules.find(r => r.id === ruleId);
      let roomId = null;
      
      try {
        const roomResponse = await axios.get(`${SERVER_URL}/api-room/rooms/space/${rule.space_id || spaceId}`);
        if (roomResponse.status === 200) {
          const roomsData = roomResponse.data;
          const room = roomsData.find(r => r.name.toLowerCase() === roomName.toLowerCase());
          
          if (room) {
            roomId = room.id;
          } else {
            toast.error(`Room "${roomName}" not found`);
            return;
          }
        } else {
          throw new Error(`HTTP error! status: ${roomResponse.status}`);
        }
      } catch (error) {
        console.error('Failed to fetch room ID:', error);
        toast.error(`Failed to fetch room ID: ${error.message}`);
        return;
      }

      // Prepare the updated rule data
      const updatedRuleData = {
        description: editValue,
        event: event,
        action: action,
        room_id: roomId,
        isNotificationRule: false,
        notificationPhoneNumber: null,
        notificationMessage: null
      };

      const response = await axios.put(`${SERVER_URL}/api-rule/rules/${ruleId}`, updatedRuleData);
      if (response.status === 200) {
        toast.success("Rule updated successfully!");
        const updatedRules = currentRules.map(rule => 
          rule.id === ruleId ? { 
            ...rule, 
            description: editValue,
            event: event,
            action: action,
            room_id: roomId,
            isNotificationRule: false,
            notificationPhoneNumber: null,
            notificationMessage: null
          } : rule
        );
        setCurrentRules(updatedRules);
        setEditRuleId(null);
      } else {
        toast.error("Failed to update rule.");
      }
    } catch (error) {
      console.error("Error updating rule:", error);
      toast.error(`Failed to update rule: ${error.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditRuleId(null);
    setEditValue("");
  };

  const promptDeleteRule = (id) => {
    setIsModalOpen(true);
    setRuleToDelete(id);
  };

  const confirmDeleteRule = async () => {
    if (ruleToDelete === null) return;
    try {
      const response = await axios.delete(`${SERVER_URL}/api-rule/rules/${ruleToDelete}`);
      if (response.status === 200) {
        const newRules = currentRules.filter((rule) => rule.id !== ruleToDelete);
        setCurrentRules(newRules);
        toast.success("Rule has been deleted.");
      }
    } catch (err) {
      toast.error("Failed to delete rule.");
    } finally {
      setIsModalOpen(false);
      setRuleToDelete(null);
    }
  };

  const handleOpenAddRuleModal = () => {
    setOpenAddRuleModal(true);
  };

  const handleCloseAddRuleModal = () => {
    setOpenAddRuleModal(false);
  };

  const handleAddRuleSuccess = async () => {
    console.log('handleAddRuleSuccess called - closing modal');
    setOpenAddRuleModal(false);
    await fetchRules(); // Refresh the rules list after adding a new rule
  };

  return (
    <div className={classes.TableContainer}>
      <div className={classes.TableHeader}>
        <TitleStyled>Rules</TitleStyled>
        <button className={classes.Button} onClick={handleOpenAddRuleModal}>
          Add Rule
        </button>
        <RulesModal show={openAddRuleModal} onCloseModal={handleCloseAddRuleModal}>
          <h2>Add Rule</h2>
          <AddRuleComponent 
            spaceId={spaceId} 
            fullName={fullName} 
            onSuccess={handleAddRuleSuccess}
            closeModal={handleCloseAddRuleModal}
          />
        </RulesModal>
      </div>
      <TableContainer>
        <TableStyled className={classes.RulesTable}>
          <thead>
            <TrStyled>
              <ThStyled>Active</ThStyled>
              <ThStyled>Rule</ThStyled>
              <ThStyled>Action</ThStyled>
            </TrStyled>
          </thead>
          <tbody>
            {currentRules.map((rule) => (
              !rule.isHidden && (
                <TrStyled
                  key={rule.id}
                  onClick={() => onRuleClick(rule.id)}
                  isSelected={rule.id === selectedRule}
                >
                  <ActiveCellStyled>
                    <Circle color={rule.isActive ? "green" : "red"} />
                  </ActiveCellStyled>
                  <RuleCell>
                    {editRuleId === rule.id ? (
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <input
                          type="text"
                          value={editValue}
                          onChange={handleEditChange}
                          style={{ flexGrow: 1 }}
                        />
                        <SaveIcon
                          onClick={() => handleSaveEdit(rule.id)}
                          style={{ cursor: "pointer", marginLeft: "8px" }}
                        />
                        <CancelIcon
                          onClick={handleCancelEdit}
                          style={{ cursor: "pointer", marginLeft: "8px" }}
                        />
                      </div>
                    ) : (
                      <span>{rule.description}</span>
                    )}
                  </RuleCell>
                  <ActionTdStyled>
                    <ActionContainer>
                      <RuleSwitch isActive={rule.isActive} id={rule.id} rule={rule.rule} currentRules={currentRules} setCurrentRules={setCurrentRules} />
                      <i
                        className="fa fa-trash"
                        onClick={(e) => {
                          e.stopPropagation();
                          promptDeleteRule(rule.id);
                        }}
                        style={{
                          cursor: "pointer",
                          color: "red",
                          fontSize: "20px",
                          marginRight: "8px",
                        }}
                      />
                      <EditIcon
                        style={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(rule);
                        }}
                      />
                    </ActionContainer>
                  </ActionTdStyled>
                </TrStyled>
              )
            ))}
          </tbody>
        </TableStyled>
      </TableContainer>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmDeleteRule}
        message="Are you sure you want to delete this rule?"
      />
    </div>
  );
};

export default RulesTable;