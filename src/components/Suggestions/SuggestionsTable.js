import { Button, Tooltip } from "@mui/material";
import Modal from "react-modal";
import Pagination from "@mui/material/Pagination";
import React from "react";
import { useState, useEffect, useMemo } from "react";
import {
  addSuggestedRule,
  getSuggestions,
  onDeleteSuggestion,
  updateSuggestions
} from "./suggestions.service";
import styled from "styled-components";
import { RuleCell } from "./RuleCell";

// Adjust the import path according to the actual package installed
import '@fortawesome/fontawesome-free/css/all.min.css';

import {
  ButtonStyled,
  DeviceCellContent,
  NewTag,
  NewTagText,
  TableContainer,
  PaginationContainer,
  TableStyled,
  TdStyled,
  ThStyled,
  TitleStyled2,
  ModalStyled,
  ChooseRoomModalStyled,
  RuleModalStyled
} from "./suggestions.styles";
import { RuleModal } from "./RuleModal";
import { SERVER_URL, TABLET_HEIGHT, TABLET_WIDTH } from "../../consts";
import ChooseRoomModal from "./ChooseRoomModal";
import axios from "axios";
import { eventEmitter } from "../../WebSocket/ws";
import ICE from '../../assets/IEC2.png'; 
import { useSuggestions } from '../../contexts/SuggestionsContext';

const itemsPerPage = 7; // Define how many items you want per page
export const SuggestionsTable = () => {
  const { 
    suggestions, 
    setSuggestions, 
    newSuggestionsCount, 
    setNewSuggestionsCount,
    removeSuggestion 
  } = useSuggestions();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRule, setSelectedRule] = useState(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isClickable, setIsClickable] = useState(true);
  const [isChooseRoomModalOpen, setIsChooseRoomModalOpen] = useState(false);

  // for making rules clickable only on tablet
  useEffect(() => {
    const handleResize = () => {
      const { innerWidth, innerHeight } = window;
      // setIsClickable(
      //   innerWidth <= 5000 && innerHeight <= TABLET_HEIGHT
      // );
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleRuleClick = (rule) => {
    if (!isClickable) return;

    setSelectedRule(rule);
    setIsRuleModalOpen(true);
  };

  const mlTrigger = () => {
    const response = axios.post(`${SERVER_URL}/api-suggestion/test`);
  }

  // Debug effect for suggestions changes
  //useEffect(() => {
    //console.log("Suggestions state changed:", suggestions);
    //console.log("Current suggestions length:", suggestions.length);
    //console.log("First suggestion:", suggestions[0]);
  //}, [suggestions]);

  // Function to handle page change
  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  // Calculate the suggestions for the current page
  const suggestionsOnPage = useMemo(() => {
    console.log("Calculating suggestions for page", currentPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const page = suggestions.slice(start, end);
    console.log("Suggestions on current page:", page);
    return page;
  }, [suggestions, currentPage]);

  //console.log("Rendering suggestions on page:", suggestionsOnPage);

  const handleDelete = (suggestionId) => {
    console.log('Deleting suggestion with ID:', suggestionId);
    removeSuggestion(suggestionId);
  };

  const handleAdd = (rule, suggestionId) => {
    setIsChooseRoomModalOpen(true);
    setSelectedRule(rule);
    // The actual deletion will happen after successful addition in ChooseRoomModal
  };

  return (
    <TableContainer>
      <TitleStyled2>Recommendations ({suggestions.length})</TitleStyled2>
      <TableStyled>
        <thead>
          <tr>
            <ThStyled>User</ThStyled>
            <ThStyled>Device</ThStyled>
            <ThStyled>Recommended Action</ThStyled>
            <ThStyled>Actions</ThStyled>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(suggestionsOnPage) && suggestionsOnPage.length > 0 ? (
            suggestionsOnPage.map((suggestion, idx) => {
              console.log("Rendering suggestion:", suggestion);
              const rule = suggestion.normalized_rule;
              const { is_new: isNew } = suggestion;
              return (
                <tr key={suggestion.id}>
                  <TdStyled>
                    <img src={ICE} alt={"ICE"} height={'40px'}/>
                  </TdStyled>
                  <TdStyled>
                    <DeviceCellContent>
                      {suggestion.device}
                      {isNew && (
                        <NewTag>
                          <NewTagText>NEW!</NewTagText>
                        </NewTag>
                      )}
                    </DeviceCellContent>
                  </TdStyled>
                  <TdStyled>
                    <Tooltip title={rule}>
                      <RuleCell onClick={() => handleRuleClick(rule)}>{rule}</RuleCell>
                    </Tooltip>
                  </TdStyled>
                  <TdStyled>
                    <ButtonStyled
                      className="custom-button"
                      onClick={() => {
                        handleAdd(rule, suggestion.id);
                      }
                    }
                    >
                      <i className="fa fa-plus" aria-hidden="true"></i> Add
                    </ButtonStyled>
                    <ButtonStyled
                      className="custom-button"
                      onClick={() => handleDelete(suggestion.id)}
                    >
                      <i className="fa fa-trash" aria-hidden="true"></i> Delete
                    </ButtonStyled>
                  </TdStyled>
                </tr>
              );
            })
          ) : (
            <tr>
              <TdStyled colSpan={4}>No recommendations available</TdStyled>
            </tr>
          )}
        </tbody>
      </TableStyled>
      <PaginationContainer>
        <Pagination
          count={Math.ceil(suggestions.length / itemsPerPage)}
          page={currentPage}
          onChange={handlePageChange}
        />
      </PaginationContainer>

      {isRuleModalOpen && (
        <RuleModalStyled isOpen={isRuleModalOpen} className={isRuleModalOpen ? '' : 'closing'}>
          <RuleModal
            selectedRule={selectedRule}
            setIsModalOpen={setIsRuleModalOpen}
          />
        </RuleModalStyled>
      )}

      {isChooseRoomModalOpen && (
        <ChooseRoomModalStyled
          isOpen={isChooseRoomModalOpen}
          className={isChooseRoomModalOpen ? '' : 'closing'}
        >
          <ChooseRoomModal
            selectedRule={selectedRule}
            setIsModalOpen={setIsChooseRoomModalOpen}
          />
        </ChooseRoomModalStyled>
      )}


    </TableContainer>
  );
};
