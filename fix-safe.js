// Script to fix SAFE investment
const fs = require('fs');
const path = require('path');

// Function to read localStorage data
function readLocalStorage() {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'localStorage.json'), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

// Function to write to localStorage data
function writeLocalStorage(data) {
    fs.writeFileSync(path.join(__dirname, 'localStorage.json'), JSON.stringify(data, null, 2));
}

// Get the current data
const data = readLocalStorage();
const investmentDetails = data.investmentDetails || {};

console.log('Current Investment Details:');
console.log(JSON.stringify(investmentDetails, null, 2));

// Find any SAFEs marked as sold (fmv = 0)
Object.entries(investmentDetails).forEach(([accountId, rounds]) => {
    Object.entries(rounds).forEach(([date, details]) => {
        if (details.round === 'SAFE' && details.fmv === 0) {
            console.log('\nFound sold SAFE:');
            console.log(`Account ID: ${accountId}`);
            console.log(`Date: ${date}`);
            console.log('Details:', details);
            
            // Remove the fmv property to restore the SAFE
            delete details.fmv;
            console.log('\nRestored SAFE details:', details);
        }
    });
});

// Save the updated data
writeLocalStorage(data);
