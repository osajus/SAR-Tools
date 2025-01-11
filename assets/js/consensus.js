"use strict";

/*

TODO
-Change variable on user input change
-Save changes to local storage
-Scenario Weights
-Export to Excel
-Consensus types

*/

class Scenario {
    constructor(name, description, regions, participants) {
        this.name = name;
        this.description = description;
        this.regions = regions;
        this.participants = participants;
    }
}
let scenarios = [];
if (sessionStorage.getItem('scenarios')) {
    scenarios = JSON.parse(sessionStorage.getItem('scenarios'));
} else {
    scenarios.push(new Scenario(
        "Example", 
        "Not all who wander are lost... except Tim.  Tim is lost as shit.  Tim is starting to get hypothermia.", 
        ["AA", "AB", "AC", "AD"], 
        [
            ["Rick", 100, 75, 25, 10], 
            ["Dan", 100, 50, 15, 5], 
            ["Mark", 75, 100, 10, 10],  
        ]
    ));
    sessionStorage.setItem('scenarios', JSON.stringify(scenarios));
}



document.addEventListener('DOMContentLoaded', (event) => {

    let dynamicArea = document.getElementById('dynamicArea');

    build_scenario_table(scenarios, dynamicArea);


});

function build_scenario_table(scenarios, dynamicArea) {
    dynamicArea.innerHTML = `<div class=buttonArea><button type="button" onClick="add_scenario(${scenarios.length}, document.getElementById('dynamicArea'))">Add Scenario</button></div>`
    let html = "";

    for (let scenarioIdx = 0; scenarioIdx < scenarios.length; scenarioIdx++) {
        let scenario = scenarios[scenarioIdx];
        html = `<div class="card_div">
        <input type=text class="scenario_head" value ='${scenario.name}' onChange="rename_scenario(${scenarioIdx}, event)"><img src="./assets/images/trash.svg"  alt="remove" class=remove onClick="remove_scenario(${scenarioIdx}, document.getElementById('dynamicArea'))"></h2>
        <input type=text class="scenario_desc" value='${scenario.description}' onChange="rename_description(${scenarioIdx}, event)"></input>
        <form>
        <table id="scenario_${scenarioIdx}">
            <thead>
                <tr>
                    <th>Participants</th>`;
        for (let regionIdx = 0; regionIdx < scenario.regions.length; regionIdx++) {
            html += `<th><input type=text class="region" value="${scenario.regions[regionIdx]}" onChange="rename_region(${scenarioIdx}, ${regionIdx}, event)"><img src="./assets/images/trash.svg"  alt="remove" class=remove onClick="remove_region(${scenarioIdx}, ${regionIdx}, document.getElementById('dynamicArea'))"></th>`;
        }
        
        html += `<th><button type="button" onClick="add_region(${scenarioIdx}, document.getElementById('dynamicArea'))">Add</button></th>
            <th>Total</th>
            </tr>
            </thead>
            <tbody>
            <tr><td><button type="button" onClick="add_participant(${scenarioIdx}, document.getElementById('dynamicArea'))">Add Participant</button></td></tr>`;

        for (let participantIdx in scenario.participants) {
            let participant = scenario.participants[participantIdx];
            html += `<tr>
                <td><input type=text class="participant" value="${participant[0]}" onChange="rename_participant(${scenarioIdx}, ${participantIdx}, event)"><img src="./assets/images/trash.svg"  alt="remove" class=remove onClick="remove_participant(${scenarioIdx}, ${participantIdx}, document.getElementById('dynamicArea'))"></td>`;
              for (let regionIdx = 1; regionIdx < participant.length; regionIdx++) {
                html += `<td><input type=text class="vote" value="${participant[regionIdx]}" onChange="change_vote(${scenarioIdx}, ${participantIdx}, ${regionIdx}, event)"></td>`;
             }
            html += `<td></td><td name="rowTot_${scenarioIdx}_${participantIdx}">rowTot_${scenarioIdx}_${participantIdx}</td></tr></tbody>`;
        }
        
        /*
        for (let regionIdx = 1; regionIdx < scenarios[scenarioIdx].regions.length + 1; regionIdx++) {
            html += `<td name="colTot_${scenarioIdx}_${regionIdx}">colTot_${scenarioIdx}_${regionIdx}</td>`;
        }

        html += `</tr><tr><td>Normalized</td>`;
        for (let regionIdx = 1; regionIdx < scenarios[scenarioIdx].regions.length + 1; regionIdx++) {
            html += `<td name="colNorm_${scenarioIdx}_${regionIdx}">colNorm_${scenarioIdx}_${regionIdx}</td>`
        }
        */
        html += `<tfoot><tr><td>Weights</td>`;
        for (let regionIdx = 1; regionIdx < scenarios[scenarioIdx].regions.length + 1; regionIdx++) {
            html += `<td name="colWeight_${scenarioIdx}_${regionIdx}">colWeight_${scenarioIdx}_${regionIdx}</td>`
        }


        html += `</tr>
                </tfoot>
            </form>
            </table>
        </div>`;

        dynamicArea.innerHTML += html;

        update_totals(scenarioIdx);
    }
    
}

function add_scenario(scenario_idx, dynamicArea) {
    scenarios.unshift(new Scenario(
        "New Scenario", 
        "New Description", 
        ["AA", "AB"], 
        [
            ["Participant 1", 0, 0]
        ]
    ));
    build_scenario_table(scenarios, dynamicArea);
}

function remove_scenario(scenario_idx, dynamicArea) {
    scenarios.splice(scenario_idx, 1);
    sessionStorage.setItem('scenarios', JSON.stringify(scenarios));
    build_scenario_table(scenarios, dynamicArea);
}

function rename_scenario(scenario_idx, event) {
    scenarios[scenario_idx].name = event.target.value;
    sessionStorage.setItem('scenarios', JSON.stringify(scenarios));
}

function rename_description(scenario_idx, event) {
    scenarios[scenario_idx].description = event.target.value;
    sessionStorage.setItem('scenarios', JSON.stringify(scenarios));
}

function add_region(scenario_idx, dynamicArea) {
    scenarios[scenario_idx].regions.push(`Reg_${scenarios[scenario_idx].regions.length + 1}`);
    scenarios[scenario_idx].participants.forEach(participant => {
        participant.push(0); // Initialize with 0 or any default value
    });
    sessionStorage.setItem('scenarios', JSON.stringify(scenarios));
    build_scenario_table(scenarios, dynamicArea);
}

function remove_region(scenario_idx, region_idx, dynamicArea) {
    scenarios[scenario_idx].regions.splice(region_idx, 1);
    
    for (let participant = 0; participant < scenarios[scenario_idx].participants.length; participant++) {
        scenarios[scenario_idx].participants[participant].splice(region_idx + 1, 1);
    }
    sessionStorage.setItem('scenarios', JSON.stringify(scenarios));
    build_scenario_table(scenarios, dynamicArea);
}

function rename_region(scenario_idx, region_idx, event) {
    scenarios[scenario_idx].regions[region_idx] = event.target.value;
    sessionStorage.setItem('scenarios', JSON.stringify(scenarios));
}

function add_participant(scenario_idx, dynamicArea) {
    let newParticipant = [`New Participant ${scenarios[scenario_idx].participants.length + 1}`];
    for (let i = 0; i < scenarios[scenario_idx].regions.length; i++) {
        newParticipant.push(0); // Initialize with 0 or any default value
    }
    scenarios[scenario_idx].participants.push(newParticipant);
    build_scenario_table(scenarios, dynamicArea);
}

function remove_participant(scenario_idx, participant_idx, dynamicArea) {
    scenarios[scenario_idx].participants.splice(participant_idx, 1);
    sessionStorage.setItem('scenarios', JSON.stringify(scenarios)); 
    build_scenario_table(scenarios, dynamicArea);
}

function rename_participant(scenario_idx, participant_idx, event) {
    scenarios[scenario_idx].participants[participant_idx][0] = event.target.value;
    sessionStorage.setItem('scenarios', JSON.stringify(scenarios));
}

function change_vote(scenario_idx, participant_idx, region_idx, event) {
    scenarios[scenario_idx].participants[participant_idx][region_idx] = event.target.value;
    sessionStorage.setItem('scenarios', JSON.stringify(scenarios));
    update_totals(scenario_idx, region_idx);
}

function update_totals(scenario_idx) {
    let col_total = 0;
    let row_total = 0;
    
    let col_totals = Array(scenarios[scenario_idx].regions.length).fill(0);

    for (let participant_idx = 0; participant_idx < scenarios[scenario_idx].participants.length; participant_idx++) {
        row_total = 0;
        for (let region_idx = 1; region_idx < scenarios[scenario_idx].participants[participant_idx].length; region_idx++) {
            row_total += parseInt(scenarios[scenario_idx].participants[participant_idx][region_idx]);
            col_totals[region_idx - 1] += parseInt(scenarios[scenario_idx].participants[participant_idx][region_idx]);
        }
        document.getElementsByName(`rowTot_${scenario_idx}_${participant_idx}`)[0].innerText = row_total;
    }

    let total_votes = 0;
    for (let region_idx = 0; region_idx < col_totals.length; region_idx++) {
        total_votes += col_totals[region_idx];
    }
    for (let region_idx = 0; region_idx < col_totals.length; region_idx++) {
        let weight = col_totals[region_idx] / total_votes;
        document.getElementsByName(`colWeight_${scenario_idx}_${region_idx + 1}`)[0].innerText = weight.toFixed(3);
    }
}

function toggleinstructions() {
    var x = document.getElementById("instructions");
    if (x.style.display == "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }

    let toggleImg = document.getElementById('toggle');
    
    if (toggleImg.src.includes('down.svg')) {
        toggleImg.src = './assets/images/up.svg';
    } else {
        toggleImg.src = './assets/images/down.svg';
    }
  } 