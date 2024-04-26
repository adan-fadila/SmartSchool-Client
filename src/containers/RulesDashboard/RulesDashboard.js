import React, { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { addRule } from "./../../store/rules/rules.actions";
import RulesModal from "./../../components/RulesModal/RulesModal";
import axios from "axios";
import RulesTable from "./../../components/RulesTable/RulesTable";
import { faChevronLeft, faSearch } from "@fortawesome/free-solid-svg-icons";
import classes from "./RulesDashboard.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { SnackBar } from "../../components/Snackbar/SnackBar";
import styled from "styled-components";
import UserContext from "../../contexts/UserContext";
import { SERVER_URL } from "../../consts";
import { SearchRuleInput } from "../../components/RulesTable/rules.styles";
import { toast } from "react-toastify";
import AddRuleComponent from '../../components/AddRuleComponent/AddRuleComponent';
import AddDetectionRuleComponent from '../../components/AddDetectionRuleComponent/AddDetectionRuleComponent';
import { Button } from "@mui/material"; // Updated import path

const ErrorMessage = styled.p`
  color: red;
`;
const RulesDashboard = () => {
  const [showModal, setShowModal] = useState(false);
  const [modalMessage] = useState("");
  const [displayIntro, setDisplayIntro] = useState(true);
  const [rules, setRules] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [openSeccessSnackBar, setOpenSuccessSnackbar] = useState(false);
  const [openFailureSnackBar, setOpenFailureSnackbar] = useState(false);
  const [errorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filteredRules, setFilteredRules] = useState([]);
  const [selectedRule, setSelectedRule] = useState(null);
  const [ setShowFilteredRules] = useState(false);
  const [temperature, setTemperature] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('>');
  const [acMode, setAcMode] = useState('Cool');
  const [componentToShow, setComponentToShow] = useState('');


  const [acState, setacState] = useState('Cool');
  const [acTemperature, setAcTemperature] = useState(26);
  
  const { user } = useContext(UserContext);
  const userRole = user?.role || "User"; // Default role to "User" if user object is not available

  // const inverseSeasonMap = {
  //   1: "winter",
  //   2: "spring",
  //   3: "summer",
  //   4: "autumn",
  // };
  // const inverseHourMap = {
  //   1: "morning",
  //   2: "afternoon",
  //   3: "evening",
  // };

  // const transformRuleInput = (inputValue) => {
  //   let transformedInput = inputValue;
  //   transformedInput = transformedInput.replace(
  //     /season\s*(\!=|==)\s*\d/,
  //     (match) => {
  //       const [_, comparator, season] = match.split(" ");
  //       return `season ${comparator} ${inverseSeasonMap[season] || season}`;
  //     }
  //   );
  //   transformedInput = transformedInput.replace(
  //     /hour\s*(\!=|==)\s*\d/,
  //     (match) => {
  //       const [_, comparator, hour] = match.split(" ");
  //       return `hour ${comparator} ${inverseHourMap[hour] || hour}`;
  //     }
  //   );
  //   return transformedInput;
  // };

 const fetchRules = async () => {
  try {
    const response = await axios.get(`${SERVER_URL}/api-rule/rules`);
    // Assuming the response.data is the array of rules you're expecting
    // No need to setRules here, we will return the data and let the caller handle it
    toast.info("Rules fetched successfully!");
    return response.data; // Return the fetched data
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log("Request canceled:", error.message);
    } else {
      console.error("Failed to fetch rules:", error);
      toast.error("Failed to fetch rules.");
    }
    return []; // Return an empty array in case of error to ensure the caller always receives an array
  }
};


  useEffect(() => {
    const fetchAllRules = async () => {
      let fetchedRules = await fetchRules();
      
      // Check if fetchedRules is not an array, then set it to an empty array
      if (!Array.isArray(fetchedRules)) {
        console.error('fetchedRules is not an array:', fetchedRules);
        fetchedRules = [];
      }
  
      // Transform fetched rules
      fetchedRules = fetchedRules.map((rule) => {
       // rule.rule = transformRuleInput(rule.rule);
        return rule;
      });
  
      setRules(fetchedRules);
    };
  
    fetchAllRules();
  }, []);
  

  const onSearchInputChange = (event) => {
    setSearch(event.target.value);
    if (event.target.value) {
      setShowFilteredRules(true);
      const filtered = rules.filter((rule) =>
        rule.rule.toLowerCase().includes(event.target.value.toLowerCase())
      );
      setFilteredRules(filtered);
    } else {
      setShowFilteredRules(false);
      setFilteredRules([]);
    }
  };

  // const onShowRulesClick = async () => {
  //   const fetchedRules = await fetchRules();
  //   setRules(fetchedRules);
  //   setDisplayIntro(false);
  // };
  const showAddRuleComponent = () => {
    setComponentToShow('AC');
  };

  // Handler to show AddDetectionRuleComponent
  const showAddDetectionRuleComponent = () => {
    setComponentToShow('Light');
  };
  const handleBackClick = () => {
    setDisplayIntro(true);
    setShowTable(false);
  };

  const closeModalHandler = () => {
    setShowModal(false);
  };

  const handleRuleClick = (ruleId) => {
    setSelectedRule(ruleId);
    setTimeout(() => setSelectedRule(null), 2000);
  };

  const handleCloseSnackBar = () => {
    setOpenSuccessSnackbar(false);
    setOpenFailureSnackbar(false);
  };

  const FilteredRules = ({ rules, onRuleClick, selectedRule }) => {
    const onRuleClickWrapper = (ruleId) => {
      onRuleClick(ruleId);
      setSearch("");
      setFilteredRules([]); // Clear the filtered rules
      setShowFilteredRules(false); // Hide the filtered rules
    };

    return (
      <div className={classes.FilteredRules}>
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`${classes.FilteredRule} ${
              rule.id === selectedRule ? classes.selected : ""
            }`}
            onClick={() => onRuleClickWrapper(rule.id)}
          >
            {rule.rule}
          </div>
        ))}
      </div>
    );
  };

  return (
    
    <div className={classes.RulesDashboard}>
      {!displayIntro && (
        <button onClick={handleBackClick} className={classes.BackButton}>
          <FontAwesomeIcon icon={faChevronLeft} />
          <span>Back</span>
        </button>
      )}

      {displayIntro ? (
        <div className={classes.IntroContainer}>
          <h3>Welcome to the Rules Dashboard</h3>
          <p>Would you like to:</p>
          <button
            className={classes.RulesDashboardButton}
            onClick={() => {
              setDisplayIntro(false);
              setShowTable(true);
            }}
          >
            Show Rules
          </button>
          <button
            className={classes.RulesDashboardButton}
            onClick={() => setDisplayIntro(false)}
          >
            Add Rule
          </button>
        </div>
      ) : showTable ? (
        <>
          <div className={classes.SearchContainer}>
            <SearchRuleInput
              type="text"
              value={search}
              onChange={onSearchInputChange}
              placeholder="Search for a rule..."
              className={classes.SearchInput}
            />
            <FontAwesomeIcon icon={faSearch} className={classes.SearchIcon} />
            {filteredRules.length > 0 && (
              <FilteredRules
                rules={filteredRules}
                onRuleClick={handleRuleClick}
                selectedRule={selectedRule}
              />
            )}
          </div>
          <RulesTable
            rules={rules}
            onRuleClick={handleRuleClick}
            selectedRule={selectedRule}
            searchText={search}
            userRole={userRole}
          />
        </>
    ) : (
        <>
          <div className={classes.RulesDashboard}>
            <h3 className={classes.RulesDashboardHeader}>Add Rule</h3>
            <div className={classes.RulesDashboardInputContainer}>
              <label htmlFor="rule-input" className={classes.RulesDashboardInputLabel}>
                Fill in the form to improve your Home's behavior:
              </label>

              <div style={{ display: 'flex', justifyContent: 'center',marginTop: '10px',  alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Button onClick={showAddRuleComponent} style={{ padding: '2px',width: '100px', cursor: 'pointer',borderRadius: '4px',transition: 'background-color 0.3s ease ',color: 'white', fontSize: '16px', backgroundColor: 'rgb(76 171 241)' }}>AC</Button>
                <Button onClick={showAddDetectionRuleComponent} style={{ padding: '2px ',width: '100px', cursor: 'pointer',borderRadius: '4px',transition: 'background-color 0.3s ease ',color: 'white', fontSize: '16px', backgroundColor: 'rgb(76 171 241)' }}>Light</Button>
              </div>
              {componentToShow === 'AC' && (
                <AddRuleComponent
                  // Pass props as necessary
                  temperature={temperature}
                  setTemperature={setTemperature}
                  selectedOperator={selectedOperator}
                  setSelectedOperator={setSelectedOperator}
                  acTemperature={acTemperature}
                  setAcTemperature={setAcTemperature}
                  acMode={acMode}
                  setAcMode={setAcMode}
                  acState={acState}
                  setacState={setacState}
                />
              )}
              {componentToShow === 'Light' && <AddDetectionRuleComponent />}
            </div>
            {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
          </div>
        </>      
       )
       }
       {openSeccessSnackBar && (
         <SnackBar
           message={"Rule is activated"}
           isOpen={true}
           handleCloseSnackBar={handleCloseSnackBar}
           color="green"
         />
       )}
       {openFailureSnackBar && (
         <SnackBar
           message={"Error adding rule"}
           isOpen={true}
           handleCloseSnackBar={handleCloseSnackBar}
           color="red"
         />
       )}
       <RulesModal
         show={showModal}
         onCloseModal={closeModalHandler}
         message={modalMessage}
       />
     </div>
    );
  };
  RulesDashboard.propTypes = {
    addRule: PropTypes.func,
  };
  const mapDispatchToProps = {
    addRule,
  };
  export default connect(null, mapDispatchToProps)(RulesDashboard);