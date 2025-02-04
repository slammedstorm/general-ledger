class ChartOfAccounts {
    constructor() {
        this.accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        this.form = document.getElementById('accountForm');
        this.accountsBody = document.getElementById('accountsBody');
        this.errorElement = document.getElementById('accountError');
        
        this.initializeEventListeners();
        this.renderAccounts();
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addAccount();
        });

        ['accountCode', 'accountName'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.hideError();
            });
        });
    }

    showError(message) {
        this.errorElement.textContent = message;
        this.errorElement.style.display = 'block';
    }

    hideError() {
        this.errorElement.style.display = 'none';
    }

    validateAccount(code, name, excludeId = null) {
        const existingCode = this.accounts.find(account => 
            account.code.toLowerCase() === code.toLowerCase() && 
            account.id !== excludeId
        );
        if (existingCode) {
            return 'An account with this code already exists';
        }

        const existingName = this.accounts.find(account => 
            account.name.toLowerCase() === name.toLowerCase() && 
            account.id !== excludeId
        );
        if (existingName) {
            return 'An account with this name already exists';
        }

        return null;
    }

    addAccount() {
        const code = document.getElementById('accountCode').value.trim();
        const name = document.getElementById('accountName').value.trim();
        const error = this.validateAccount(code, name);
        
        if (error) {
            this.showError(error);
            return;
        }

        const accountType = document.getElementById('accountType').value;
        const account = {
            code: code,
            name: name,
            accountType: accountType,
            description: document.getElementById('accountDescription').value.trim(),
            id: Date.now()
        };

        this.accounts.push(account);

        // If this is an Investment account, automatically create a corresponding MTM account
        if (accountType === 'Investment') {
            const mtmAccount = {
                code: code + '1',
                name: name + ' - MTM',
                accountType: 'MTM',
                description: 'MTM account for ' + name,
                id: Date.now() + 1
            };

            // Validate the MTM account
            const mtmError = this.validateAccount(mtmAccount.code, mtmAccount.name);
            if (!mtmError) {
                this.accounts.push(mtmAccount);
            }
        }

        this.saveToLocalStorage();
        this.renderAccounts();
        this.form.reset();
        this.hideError();
    }

    deleteAccount(id) {
        this.accounts = this.accounts.filter(account => account.id !== id);
        this.saveToLocalStorage();
        this.renderAccounts();
    }

    renderAccounts() {
        this.accountsBody.innerHTML = '';
        
        this.accounts
            .sort((a, b) => a.code.localeCompare(b.code))
            .forEach(account => {
                const row = document.createElement('tr');
                row.dataset.id = account.id;
                
                if (this.editingAccountId === account.id) {
                    row.innerHTML = `
                        <td>
                            <input type="text" class="edit-code" value="${account.code}" required>
                        </td>
                        <td>
                            <input type="text" class="edit-name" value="${account.name}" required>
                        </td>
                        <td>
                            <select class="edit-type" required>
                                ${this.generateAccountTypeOptions(account.accountType)}
                            </select>
                        </td>
                        <td>
                            <input type="text" class="edit-description" value="${account.description || ''}">
                        </td>
                        <td>
                            <button class="save-btn">Save</button>
                            <button class="cancel-btn">Cancel</button>
                        </td>
                    `;
                    
                    row.querySelector('.save-btn').addEventListener('click', () => {
                        this.saveAccountEdit(row, account);
                    });
                    
                    row.querySelector('.cancel-btn').addEventListener('click', () => {
                        this.cancelAccountEdit();
                    });
                } else {
                    row.innerHTML = `
                        <td>${account.code}</td>
                        <td>${account.name}</td>
                        <td>${account.accountType}</td>
                        <td>${account.description || ''}</td>
                        <td>
                            <button class="edit-btn" data-id="${account.id}">Edit</button>
                            <button class="delete-btn" data-id="${account.id}">Delete</button>
                        </td>
                    `;
                    
                    row.querySelector('.edit-btn').addEventListener('click', () => {
                        this.editingAccountId = account.id;
                        this.renderAccounts();
                    });
                    
                    row.querySelector('.delete-btn').addEventListener('click', () => {
                        this.deleteAccount(account.id);
                    });
                }
                
                this.accountsBody.appendChild(row);
            });
    }

    generateAccountTypeOptions(selectedType) {
        const types = {
            'Asset': ['Current Asset', 'Non-current Asset', 'Prepayment', 'Bank Account', 'Investment', 'MTM'],
            'Liability': ['Current Liability', 'Non-current Liability'],
            'Equity': ['Equity'],
            'Revenue': ['Other Income', 'Revenue', 'Sales'],
            'Expense': ['Depreciation', 'Expense']
        };

        let options = '';
        Object.entries(types).forEach(([group, items]) => {
            options += `<optgroup label="${group}">`;
            items.forEach(type => {
                options += `<option value="${type}" ${type === selectedType ? 'selected' : ''}>${type}</option>`;
            });
            options += '</optgroup>';
        });
        return options;
    }

    saveAccountEdit(row, originalAccount) {
        const code = row.querySelector('.edit-code').value.trim();
        const name = row.querySelector('.edit-name').value.trim();
        
        // Only validate if code or name has changed
        if (code !== originalAccount.code || name !== originalAccount.name) {
            const error = this.validateAccount(code, name, originalAccount.id);
            if (error) {
                this.showError(error);
                return;
            }
        }

        const newAccountType = row.querySelector('.edit-type').value;
        const oldAccountType = originalAccount.accountType;

        const updatedAccount = {
            ...originalAccount,
            code: code,
            name: name,
            accountType: newAccountType,
            description: row.querySelector('.edit-description').value.trim()
        };

        const index = this.accounts.findIndex(a => a.id === originalAccount.id);
        this.accounts[index] = updatedAccount;

        // Handle MTM account when Investment account is edited
        if (oldAccountType === 'Investment' || newAccountType === 'Investment') {
            const mtmCode = originalAccount.code + '1';
            const existingMTMIndex = this.accounts.findIndex(a => a.code === mtmCode);

            if (newAccountType === 'Investment' && existingMTMIndex === -1) {
                // Create new MTM account if changing to Investment
                const mtmAccount = {
                    code: code + '1',
                    name: name + ' - MTM',
                    accountType: 'MTM',
                    description: 'MTM account for ' + name,
                    id: Date.now()
                };

                const mtmError = this.validateAccount(mtmAccount.code, mtmAccount.name);
                if (!mtmError) {
                    this.accounts.push(mtmAccount);
                }
            } else if (newAccountType !== 'Investment' && existingMTMIndex !== -1) {
                // Remove MTM account if changing from Investment to something else
                this.accounts.splice(existingMTMIndex, 1);
            } else if (newAccountType === 'Investment' && existingMTMIndex !== -1) {
                // Update existing MTM account if Investment account is renamed
                this.accounts[existingMTMIndex] = {
                    ...this.accounts[existingMTMIndex],
                    code: code + '1',
                    name: name + ' - MTM',
                    description: 'MTM account for ' + name
                };
            }
        }
        
        this.saveToLocalStorage();
        this.editingAccountId = null;
        this.renderAccounts();
    }

    cancelAccountEdit() {
        this.editingAccountId = null;
        this.renderAccounts();
    }

    resetForm() {
        this.form.reset();
        const submitBtn = this.form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Add Account';
        this.editingAccountId = null;
        
        this.form.onsubmit = (e) => {
            e.preventDefault();
            this.addAccount();
        };
    }

    saveToLocalStorage() {
        localStorage.setItem('chartOfAccounts', JSON.stringify(this.accounts));
    }
}

class GeneralLedger {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('journalEntries')) || [];
        this.form = document.getElementById('transactionForm');
        this.ledgerBody = document.getElementById('ledgerBody');
        this.lineItemsContainer = document.getElementById('lineItems');
        this.addLineItemBtn = document.getElementById('addLineItem');
        this.sortDateBtn = document.getElementById('sortDateBtn');
        this.sortDirection = 'asc'; // Default sort direction
        
        this.initializeEventListeners();
        this.addLineItemRow();
        this.renderLedger();
    }

    initializeEventListeners() {
        this.sortDateBtn.addEventListener('click', () => {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            this.sortDateBtn.textContent = `Sort by Date ${this.sortDirection === 'asc' ? '↑' : '↓'}`;
            this.renderLedger();
        });

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        this.addLineItemBtn.addEventListener('click', () => {
            this.addLineItemRow();
        });

        this.lineItemsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-line-item')) {
                const lineItem = e.target.closest('.line-item');
                if (this.lineItemsContainer.children.length > 1) {
                    lineItem.remove();
                }
                this.updateRemoveButtons();
                this.updateTotals();
            }
        });
    }

    updateAccountSelects() {
        const accountSelects = document.querySelectorAll('.account-select');
        const chartOfAccounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        
        accountSelects.forEach(select => {
            select.innerHTML = '<option value="">Select Account</option>';
            
            const accountsByType = chartOfAccounts.reduce((acc, account) => {
                if (!acc[account.accountType]) {
                    acc[account.accountType] = [];
                }
                acc[account.accountType].push(account);
                return acc;
            }, {});

            Object.entries(accountsByType).forEach(([type, accounts]) => {
                const group = document.createElement('optgroup');
                group.label = type;
                
                accounts.forEach(account => {
                    const option = document.createElement('option');
                    option.value = account.id;
                    option.textContent = `${account.code} - ${account.name}`;
                    group.appendChild(option);
                });
                
                select.appendChild(group);
            });
        });
    }

    addLineItemRow() {
        const lineItem = document.createElement('div');
        lineItem.className = 'line-item';
        lineItem.innerHTML = `
            <select class="account-select" required>
                <option value="">Select Account</option>
            </select>
            <input type="text" class="line-item-description" placeholder="Description">
            <input type="number" class="debit-input" step="0.01" min="0" placeholder="0.00">
            <input type="number" class="credit-input" step="0.01" min="0" placeholder="0.00">
            <button type="button" class="remove-line-item" style="display: none;">&times;</button>
        `;
        
        this.lineItemsContainer.appendChild(lineItem);
        this.updateAccountSelects();
        this.updateRemoveButtons();
        this.setupLineItemListeners(lineItem);
    }

    setupLineItemListeners(lineItem) {
        const debitInput = lineItem.querySelector('.debit-input');
        const creditInput = lineItem.querySelector('.credit-input');

        debitInput.addEventListener('input', () => {
            if (debitInput.value) {
                creditInput.value = '';
                creditInput.disabled = true;
            } else {
                creditInput.disabled = false;
            }
            this.updateTotals();
        });

        creditInput.addEventListener('input', () => {
            if (creditInput.value) {
                debitInput.value = '';
                debitInput.disabled = true;
            } else {
                debitInput.disabled = false;
            }
            this.updateTotals();
        });
    }

    updateTotals() {
        let debitTotal = 0;
        let creditTotal = 0;

        this.lineItemsContainer.querySelectorAll('.line-item').forEach(item => {
            const debitValue = parseFloat(item.querySelector('.debit-input').value) || 0;
            const creditValue = parseFloat(item.querySelector('.credit-input').value) || 0;
            debitTotal += debitValue;
            creditTotal += creditValue;
        });

        document.querySelector('.debit-total').textContent = this.formatCurrency(debitTotal);
        document.querySelector('.credit-total').textContent = this.formatCurrency(creditTotal);

        const balanceError = document.getElementById('balance-error');
        balanceError.style.display = debitTotal !== creditTotal ? 'block' : 'none';
    }

    updateRemoveButtons() {
        const removeButtons = document.querySelectorAll('.remove-line-item');
        removeButtons.forEach(button => {
            button.style.display = this.lineItemsContainer.children.length > 1 ? 'block' : 'none';
        });
    }

    addTransaction() {
        const debitTotal = this.calculateTotal('debit');
        const creditTotal = this.calculateTotal('credit');

        if (debitTotal !== creditTotal) {
            document.getElementById('balance-error').style.display = 'block';
            return;
        }

        const lineItems = Array.from(this.lineItemsContainer.children).map(lineItem => {
            const accountSelect = lineItem.querySelector('.account-select');
            const account = this.getAccountById(accountSelect.value);
            const debitAmount = parseFloat(lineItem.querySelector('.debit-input').value) || 0;
            const creditAmount = parseFloat(lineItem.querySelector('.credit-input').value) || 0;
            
            return {
                accountId: accountSelect.value,
                accountName: account ? `${account.code} - ${account.name}` : '',
                accountType: account ? account.accountType : '',
                description: lineItem.querySelector('.line-item-description').value.trim(),
                type: debitAmount > 0 ? 'debit' : 'credit',
                amount: debitAmount > 0 ? debitAmount : creditAmount
            };
        }).filter(item => item.amount > 0);

        const transaction = {
            date: document.getElementById('date').value,
            description: document.getElementById('description').value,
            lineItems: lineItems,
            id: Date.now()
        };

        this.transactions.push(transaction);
        this.saveToLocalStorage();
        this.renderLedger();
        this.form.reset();
        
        this.lineItemsContainer.innerHTML = '';
        this.addLineItemRow();
        this.updateTotals();
    }

    calculateTotal(type) {
        return Array.from(this.lineItemsContainer.children)
            .reduce((sum, item) => {
                const value = parseFloat(item.querySelector(`.${type}-input`).value) || 0;
                return sum + value;
            }, 0);
    }

    getAccountById(id) {
        const chartOfAccounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        return chartOfAccounts.find(account => account.id.toString() === id);
    }

    formatDate(dateString) {
        // Add time component to ensure date is interpreted in local timezone
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    renderLedger() {
        this.ledgerBody.innerHTML = '';
        let runningBalance = 0;

        this.transactions
            .sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return this.sortDirection === 'asc' ? 
                    dateA - dateB : 
                    dateB - dateA;
            })
            .forEach(transaction => {
                const isEditing = this.editingTransactionId === transaction.id;
                
                const headerRow = document.createElement('tr');
                headerRow.className = 'transaction-header';
                headerRow.dataset.id = transaction.id;

                if (isEditing) {
                    headerRow.innerHTML = `
                        <td>
                            <input type="date" class="edit-date" value="${transaction.date}" required>
                        </td>
                        <td colspan="4">
                            <input type="text" class="edit-description" value="${transaction.description || ''}">
                        </td>
                        <td class="transaction-actions">
                            <button class="save-btn">Save</button>
                            <button class="cancel-btn">Cancel</button>
                        </td>
                    `;

                    headerRow.querySelector('.save-btn').addEventListener('click', () => {
                        this.saveTransactionEdit(headerRow, transaction);
                    });
                    
                    headerRow.querySelector('.cancel-btn').addEventListener('click', () => {
                        this.cancelTransactionEdit();
                    });
                } else {
                    headerRow.innerHTML = `
                        <td>${this.formatDate(transaction.date)}</td>
                        <td colspan="5">${transaction.description || ''}</td>
                        <td class="transaction-actions">
                            <button class="edit-btn" data-id="${transaction.id}">Edit</button>
                            <button class="delete-btn" data-id="${transaction.id}">Delete</button>
                        </td>
                    `;

                    headerRow.querySelector('.edit-btn').addEventListener('click', () => {
                        this.editingTransactionId = transaction.id;
                        this.renderLedger();
                    });
                    
                    headerRow.querySelector('.delete-btn').addEventListener('click', () => {
                        this.deleteTransaction(transaction.id);
                    });
                }
                
                this.ledgerBody.appendChild(headerRow);

                transaction.lineItems.forEach((item, index) => {
                    if (item.type === 'debit') {
                        runningBalance += item.amount;
                    } else {
                        runningBalance -= item.amount;
                    }

                    const row = document.createElement('tr');
                    row.className = 'transaction-line-item';
                    
                    if (isEditing) {
                        row.innerHTML = `
                            <td class="line-item-spacer"></td>
                            <td>
                                <input type="text" class="edit-description" value="${item.description || ''}">
                            </td>
                            <td>
                                <select class="edit-account" required>
                                    ${this.generateAccountOptions(item.accountId)}
                                </select>
                            </td>
                            <td>${item.accountType}</td>
                            <td>
                                <input type="number" class="edit-debit" step="0.01" min="0" 
                                    value="${item.type === 'debit' ? item.amount : ''}"
                                    ${item.type === 'credit' ? 'disabled' : ''}>
                            </td>
                            <td>
                                <input type="number" class="edit-credit" step="0.01" min="0"
                                    value="${item.type === 'credit' ? item.amount : ''}"
                                    ${item.type === 'debit' ? 'disabled' : ''}>
                            </td>
                            <td>${this.formatCurrency(runningBalance)}</td>
                        `;
                    } else {
                    row.innerHTML = `
                            <td class="line-item-spacer"></td>
                            <td>${item.description || ''}</td>
                            <td>${item.accountName}</td>
                            <td>${item.accountType}</td>
                            <td>${item.type === 'debit' ? this.formatCurrency(item.amount) : ''}</td>
                            <td>${item.type === 'credit' ? this.formatCurrency(item.amount) : ''}</td>
                            <td>${this.formatCurrency(runningBalance)}</td>
                        `;
                    }
                    
                    this.ledgerBody.appendChild(row);
                });

                const spacerRow = document.createElement('tr');
                spacerRow.className = 'transaction-spacer';
                spacerRow.innerHTML = '<td colspan="7"></td>';
                this.ledgerBody.appendChild(spacerRow);
            });
    }

    generateAccountOptions(selectedId) {
        const chartOfAccounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        const accountsByType = chartOfAccounts.reduce((acc, account) => {
            if (!acc[account.accountType]) {
                acc[account.accountType] = [];
            }
            acc[account.accountType].push(account);
            return acc;
        }, {});

        let options = '<option value="">Select Account</option>';
        Object.entries(accountsByType).forEach(([type, accounts]) => {
            options += `<optgroup label="${type}">`;
            accounts.forEach(account => {
                options += `<option value="${account.id}" ${account.id.toString() === selectedId.toString() ? 'selected' : ''}>
                    ${account.code} - ${account.name}
                </option>`;
            });
            options += '</optgroup>';
        });
        return options;
    }

    saveTransactionEdit(headerRow, originalTransaction) {
        const date = headerRow.querySelector('.edit-date').value;
        const description = headerRow.querySelector('.edit-description').value.trim();
        
        const lineItems = [];
        let currentRow = headerRow.nextElementSibling;
        while (currentRow && currentRow.classList.contains('transaction-line-item')) {
            const accountSelect = currentRow.querySelector('.edit-account');
            const account = this.getAccountById(accountSelect.value);
            const debitAmount = parseFloat(currentRow.querySelector('.edit-debit').value) || 0;
            const creditAmount = parseFloat(currentRow.querySelector('.edit-credit').value) || 0;
            
            if (debitAmount > 0 || creditAmount > 0) {
                lineItems.push({
                    accountId: accountSelect.value,
                    accountName: account ? `${account.code} - ${account.name}` : '',
                    accountType: account ? account.accountType : '',
                    description: currentRow.querySelector('.edit-description').value.trim(),
                    type: debitAmount > 0 ? 'debit' : 'credit',
                    amount: debitAmount > 0 ? debitAmount : creditAmount
                });
            }
            
            currentRow = currentRow.nextElementSibling;
        }

        const totalDebits = lineItems.reduce((sum, item) => sum + (item.type === 'debit' ? item.amount : 0), 0);
        const totalCredits = lineItems.reduce((sum, item) => sum + (item.type === 'credit' ? item.amount : 0), 0);
        
        if (totalDebits !== totalCredits) {
            alert('Debits and credits must be equal');
            return;
        }

        const updatedTransaction = {
            ...originalTransaction,
            date: date,
            description: description,
            lineItems: lineItems
        };

        const index = this.transactions.findIndex(t => t.id === originalTransaction.id);
        this.transactions[index] = updatedTransaction;
        
        this.saveToLocalStorage();
        this.editingTransactionId = null;
        this.renderLedger();
    }

    cancelTransactionEdit() {
        this.editingTransactionId = null;
        this.renderLedger();
    }

    deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveToLocalStorage();
            this.renderLedger();
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('journalEntries', JSON.stringify(this.transactions));
    }
}

class Investments {
    constructor() {
        this.investmentsBody = document.getElementById('investmentsBody');
        this.editingRowId = null;
        this.newCompanyBtn = document.getElementById('newCompanyBtn');
        this.initializeEventListeners();
        this.renderInvestments();
    }

    initializeEventListeners() {
        this.newCompanyBtn.addEventListener('click', () => {
            this.createNewCompany();
        });
    }

    async createNewCompany() {
        const companyName = prompt('Enter company name:');
        if (!companyName) return;

        const accountCode = prompt('Enter account code:');
        if (!accountCode) return;

        // Get existing accounts and validate
        const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        
        // Validate account code format and uniqueness
        const existingCode = accounts.find(a => a.code === accountCode);
        if (existingCode) {
            alert('An account with this code already exists');
            return;
        }

        // Validate company name uniqueness
        const existingName = accounts.find(a => 
            a.name.toLowerCase() === companyName.toLowerCase() ||
            a.name.toLowerCase() === (companyName + ' - MTM').toLowerCase()
        );
        if (existingName) {
            alert('A company with this name already exists');
            return;
        }
        
        // Create Investment account
        const investmentAccount = {
            code: accountCode,
            name: companyName,
            accountType: 'Investment',
            description: `Investment account for ${companyName}`,
            id: Date.now()
        };

        // Create MTM account
        const mtmAccount = {
            code: accountCode + '1',
            name: companyName + ' - MTM',
            accountType: 'MTM',
            description: 'MTM account for ' + companyName,
            id: Date.now() + 1
        };

        accounts.push(investmentAccount, mtmAccount);
        localStorage.setItem('chartOfAccounts', JSON.stringify(accounts));
        
        this.renderInvestments();
    }

    generateEditingRow(account, transaction, shares, costPerShare, fmvPerShare, cost, fmv, details) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="edit-company" value="${account.name}"></td>
            <td>${new Date(transaction.date).toLocaleDateString()}</td>
            <td><input type="text" class="edit-round" value="${details.round || ''}"></td>
            <td class="amount-cell"><input type="number" class="edit-shares" value="${shares}"></td>
            <td class="amount-cell">${this.formatCurrency(costPerShare)}</td>
            <td class="amount-cell"><input type="number" step="0.01" class="edit-fmv-per-share" value="${fmvPerShare}"></td>
            <td class="amount-cell">${this.formatCurrency(cost)}</td>
            <td class="amount-cell"><input type="number" step="0.01" class="edit-fmv" value="${fmv}"></td>
            <td class="amount-cell ${fmv - cost >= 0 ? 'positive' : 'negative'}">
                ${this.formatCurrency(fmv - cost)}
            </td>
            <td>
                <button class="save-btn">Save</button>
                <button class="cancel-btn">Cancel</button>
            </td>
        `;

        // Add event listeners for automatic calculations
        const sharesInput = row.querySelector('.edit-shares');
        const fmvPerShareInput = row.querySelector('.edit-fmv-per-share');
        const fmvInput = row.querySelector('.edit-fmv');

        sharesInput.addEventListener('input', () => {
            const shares = parseFloat(sharesInput.value) || 0;
            const fmvPerShare = parseFloat(fmvPerShareInput.value) || 0;
            fmvInput.value = (shares * fmvPerShare).toFixed(2);
        });

        fmvPerShareInput.addEventListener('input', () => {
            const shares = parseFloat(sharesInput.value) || 0;
            const fmvPerShare = parseFloat(fmvPerShareInput.value) || 0;
            fmvInput.value = (shares * fmvPerShare).toFixed(2);
        });

        fmvInput.addEventListener('input', () => {
            const shares = parseFloat(sharesInput.value) || 0;
            const fmv = parseFloat(fmvInput.value) || 0;
            if (shares > 0) {
                fmvPerShareInput.value = (fmv / shares).toFixed(2);
            }
        });

        // Add save and cancel handlers
        row.querySelector('.save-btn').addEventListener('click', () => {
            this.saveInvestmentEdit(row, account, transaction);
        });

        row.querySelector('.cancel-btn').addEventListener('click', () => {
            this.editingRowId = null;
            this.renderInvestments();
        });

        return row;
    }

    saveInvestmentEdit(row, account, transaction) {
        const newCompany = row.querySelector('.edit-company').value.trim();
        const newRound = row.querySelector('.edit-round').value.trim();
        const newShares = parseFloat(row.querySelector('.edit-shares').value) || 0;
        const newFmvPerShare = parseFloat(row.querySelector('.edit-fmv-per-share').value) || 0;
        const newFmv = parseFloat(row.querySelector('.edit-fmv').value) || 0;

        const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        
        // Update account names if company name changed
        if (newCompany !== account.name) {
            // Update investment account name
            const accountIndex = accounts.findIndex(a => a.id === account.id);
            if (accountIndex !== -1) {
                accounts[accountIndex].name = newCompany;
                
                // Find and update corresponding MTM account
                const mtmCode = accounts[accountIndex].code + '1';
                const mtmIndex = accounts.findIndex(a => a.code === mtmCode);
                if (mtmIndex !== -1) {
                    accounts[mtmIndex].name = newCompany + ' - MTM';
                    accounts[mtmIndex].description = 'MTM account for ' + newCompany;
                }
                
                localStorage.setItem('chartOfAccounts', JSON.stringify(accounts));
            }
        }

        // Get previous FMV value and calculate change
        const storedDetails = JSON.parse(localStorage.getItem('investmentDetails')) || {};
        const previousDetails = storedDetails[account.id]?.[transaction.date] || {};
        const previousFmv = previousDetails.fmv || transaction.amount;
        const fmvChange = newFmv - previousFmv;
        
        if (fmvChange !== 0) {
            // Find MTM account
            const mtmAccount = accounts.find(a => a.code === account.code + '1');
            
            // Find or create Unrealized Gain/Loss Revenue account
            let unrealizedAccount = accounts.find(a => 
                a.accountType === 'Revenue' && 
                a.code === 'UGL' && 
                a.name === 'Unrealized Gain/Loss'
            );
            
            if (!unrealizedAccount) {
                unrealizedAccount = {
                    code: 'UGL',
                    name: 'Unrealized Gain/Loss',
                    accountType: 'Revenue',
                    description: 'Account for recording unrealized gains and losses',
                    id: Date.now() + Math.floor(Math.random() * 1000)
                };
                accounts.push(unrealizedAccount);
                localStorage.setItem('chartOfAccounts', JSON.stringify(accounts));
            }
            
            // Create journal entry
            const journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
            const newEntry = {
                date: new Date().toISOString().split('T')[0],
                description: `MTM adjustment for ${account.name}`,
                lineItems: [
                    {
                        accountId: mtmAccount.id.toString(),
                        accountName: `${mtmAccount.code} - ${mtmAccount.name}`,
                        accountType: mtmAccount.accountType,
                        description: 'MTM adjustment',
                        type: fmvChange > 0 ? 'debit' : 'credit',
                        amount: Math.abs(fmvChange)
                    },
                    {
                        accountId: unrealizedAccount.id.toString(),
                        accountName: `${unrealizedAccount.code} - ${unrealizedAccount.name}`,
                        accountType: unrealizedAccount.accountType,
                        description: 'MTM adjustment',
                        type: fmvChange > 0 ? 'credit' : 'debit',
                        amount: Math.abs(fmvChange)
                    }
                ],
                id: Date.now()
            };
            
            journalEntries.push(newEntry);
            localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
        }

        // Update stored investment details
        if (!storedDetails[account.id]) {
            storedDetails[account.id] = {};
        }
        storedDetails[account.id][transaction.date] = {
            shares: newShares,
            fmvPerShare: newFmvPerShare,
            fmv: newFmv,
            round: newRound
        };
        localStorage.setItem('investmentDetails', JSON.stringify(storedDetails));

        this.editingRowId = null;
        this.renderInvestments();
    }

    getInvestmentAccounts() {
        const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        return accounts.filter(account => account.accountType === 'Investment');
    }

    getTransactionsForAccount(accountId) {
        const transactions = JSON.parse(localStorage.getItem('journalEntries')) || [];
        const accountTransactions = transactions
            .filter(transaction => 
                transaction.lineItems.some(item => item.accountId === accountId.toString())
            )
            .map(transaction => {
                const lineItem = transaction.lineItems.find(item => 
                    item.accountId === accountId.toString()
                );
                return {
                    date: transaction.date,
                    amount: lineItem.type === 'debit' ? lineItem.amount : -lineItem.amount
                };
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate total balance
        const balance = accountTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        return {
            transactions: accountTransactions,
            balance: balance
        };
    }

    renderInvestments() {
        this.investmentsBody.innerHTML = '';
        const investmentAccounts = this.getInvestmentAccounts();
        const investmentDetails = JSON.parse(localStorage.getItem('investmentDetails')) || {};
        
        investmentAccounts.forEach(account => {
            const { transactions, balance } = this.getTransactionsForAccount(account.id);
            // Skip if no transactions or zero balance
            if (transactions.length === 0 || balance === 0) return;

            let totalCost = 0;
            let totalFMV = 0;

            // Add individual transaction rows
            transactions.forEach(transaction => {
                const cost = transaction.amount;
                const details = investmentDetails[account.id]?.[transaction.date] || {};
                
                // Use stored values or defaults
                const shares = details.shares || 100;
                const costPerShare = cost / shares;
                const fmvPerShare = details.fmvPerShare || costPerShare;
                const fmv = details.fmv || cost;
                const unrealizedGainLoss = fmv - cost;
                
                totalCost += cost;
                totalFMV += fmv;

                const rowId = `${account.id}-${transaction.date}`;
                
                if (this.editingRowId === rowId) {
                    const row = this.generateEditingRow(
                        account, 
                        transaction, 
                        shares, 
                        costPerShare, 
                        fmvPerShare, 
                        cost, 
                        fmv,
                        details
                    );
                    this.investmentsBody.appendChild(row);
                } else {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${account.name}</td>
                        <td>${this.formatDate(transaction.date)}</td>
                        <td>${details.round || ''}</td>
                        <td class="amount-cell">${shares.toLocaleString()}</td>
                        <td class="amount-cell">${this.formatCurrency(costPerShare)}</td>
                        <td class="amount-cell">${this.formatCurrency(fmvPerShare)}</td>
                        <td class="amount-cell">${this.formatCurrency(cost)}</td>
                        <td class="amount-cell">${this.formatCurrency(fmv)}</td>
                        <td class="amount-cell ${unrealizedGainLoss >= 0 ? 'positive' : 'negative'}">
                            ${this.formatCurrency(unrealizedGainLoss)}
                        </td>
                        <td>
                            <button class="edit-btn">Edit</button>
                        </td>
                    `;

                    row.querySelector('.edit-btn').addEventListener('click', () => {
                        this.editingRowId = rowId;
                        this.renderInvestments();
                    });
                    
                    this.investmentsBody.appendChild(row);
                }
            });

            // Add subtotal row if there are multiple transactions
            if (transactions.length > 1) {
                const totalUnrealizedGainLoss = totalFMV - totalCost;
                const subtotalRow = document.createElement('tr');
                subtotalRow.className = 'subtotal-row';
                subtotalRow.innerHTML = `
                    <td colspan="6"><strong>Subtotal for ${account.name}</strong></td>
                    <td class="amount-cell"><strong>${this.formatCurrency(totalCost)}</strong></td>
                    <td class="amount-cell"><strong>${this.formatCurrency(totalFMV)}</strong></td>
                    <td class="amount-cell ${totalUnrealizedGainLoss >= 0 ? 'positive' : 'negative'}">
                        <strong>${this.formatCurrency(totalUnrealizedGainLoss)}</strong>
                    </td>
                `;
                this.investmentsBody.appendChild(subtotalRow);

                // Add spacer row
                const spacerRow = document.createElement('tr');
                spacerRow.innerHTML = '<td colspan="9">&nbsp;</td>';
                this.investmentsBody.appendChild(spacerRow);
            }
        });
    }

    formatDate(dateString) {
        // Add time component to ensure date is interpreted in local timezone
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
}

class Reports {
    constructor() {
        this.reportType = document.getElementById('reportType');
        this.startDate = document.getElementById('startDate');
        this.endDate = document.getElementById('endDate');
        this.asOfDate = document.getElementById('asOfDate');
        this.dateRange = document.getElementById('dateRange');
        this.singleDate = document.getElementById('singleDate');
        this.generateButton = document.getElementById('generateReport');
        this.reportTitle = document.getElementById('reportTitle');
        this.reportDate = document.getElementById('reportDate');
        this.reportTable = document.getElementById('reportTable');

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.reportType.addEventListener('change', () => {
            this.toggleDateInputs();
            this.toggleAccountSelector();
            if (this.reportType.value === 'transaction') {
                this.populateAccountSelector();
            }
        });

        this.generateButton.addEventListener('click', () => {
            if (!this.reportType.value) {
                alert('Please select a report type');
                return;
            }

            const isSingleDate = this.usesSingleDate();
            if (isSingleDate && !this.asOfDate.value) {
                alert('Please select a date');
                return;
            }
            if (!isSingleDate && (!this.startDate.value || !this.endDate.value)) {
                alert('Please select a date range');
                return;
            }

            this.generateReport();
            document.getElementById('exportReport').style.display = 'block';
        });

        document.getElementById('exportReport').addEventListener('click', () => {
            this.exportToExcel();
        });
    }

    generateBalanceSheet() {
        const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        const transactions = this.getTransactionsInRange();
        const balances = this.calculateAccountBalances(transactions);
        
        this.reportTitle.textContent = 'Balance Sheet';
        this.reportDate.textContent = `As of ${this.formatDate(this.asOfDate.value)}`;

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Assets</th>
                        <th class="amount-cell">Amount</th>
                    </tr>
                </thead>
                <tbody>`;

        // Assets (debit balance accounts)
        const assetTypes = ['Current Asset', 'Non-current Asset', 'Prepayment', 'Bank Account', 'Investment', 'MTM'];
        let totalAssets = 0;
        
        assetTypes.forEach(assetType => {
            const assetAccounts = accounts.filter(a => a.accountType === assetType);
            if (assetAccounts.length > 0) {
                html += `<tr><td class="indent-1">${assetType}</td><td></td></tr>`;
                assetAccounts.forEach(account => {
                    const balance = balances[account.id] || 0;
                    if (balance !== 0) {
                        // Assets increase with debits, show as positive
                        totalAssets += balance;
                        html += `
                            <tr>
                                <td class="indent-2">${account.code} - ${account.name}</td>
                                <td class="amount-cell">${this.formatCurrency(balance)}</td>
                            </tr>`;
                    }
                });
            }
        });
        
        html += `
            <tr class="total-row">
                <td>Total Assets</td>
                <td class="amount-cell">${this.formatCurrency(totalAssets)}</td>
            </tr>`;

        // Liabilities (credit balance accounts)
        const liabilityTypes = ['Current Liability', 'Non-current Liability'];
        html += `<tr class="subtotal-row"><td>Liabilities</td><td></td></tr>`;
        let totalLiabilities = 0;
        
        liabilityTypes.forEach(liabilityType => {
            const liabilityAccounts = accounts.filter(a => a.accountType === liabilityType);
            if (liabilityAccounts.length > 0) {
                html += `<tr><td class="indent-1">${liabilityType}</td><td></td></tr>`;
                liabilityAccounts.forEach(account => {
                    const balance = balances[account.id] || 0;
                    if (balance !== 0) {
                        // Liabilities increase with credits, balance is already positive
                        totalLiabilities += balance;
                        html += `
                            <tr>
                                <td class="indent-2">${account.code} - ${account.name}</td>
                                <td class="amount-cell">${this.formatCurrency(balance)}</td>
                            </tr>`;
                    }
                });
            }
        });
        
        html += `
            <tr class="total-row">
                <td>Total Liabilities</td>
                <td class="amount-cell">${this.formatCurrency(totalLiabilities)}</td>
            </tr>`;

        // Equity (credit balance accounts)
        html += `<tr class="subtotal-row"><td>Equity</td><td></td></tr>`;
        let totalEquity = 0;
        
        // Split transactions into current year and prior years
        const currentYearStart = new Date(this.asOfDate.value);
        currentYearStart.setMonth(0, 1); // January 1st of current year
        const asOfDate = new Date(this.asOfDate.value);

        const [currentYearTransactions, priorYearTransactions] = transactions.reduce(
            ([current, prior], t) => {
                const transactionDate = new Date(t.date);
                if (transactionDate >= currentYearStart && transactionDate <= asOfDate) {
                    current.push(t);
                } else if (transactionDate < currentYearStart) {
                    prior.push(t);
                }
                return [current, prior];
            },
            [[], []]
        );

        // Regular equity accounts
        const equityAccounts = accounts.filter(a => a.accountType === 'Equity');
        equityAccounts.forEach(account => {
            const balance = balances[account.id] || 0;
            if (balance !== 0) {
                // Equity increases with credits, balance is already positive
                totalEquity += balance;
                html += `
                    <tr>
                        <td class="indent-1">${account.code} - ${account.name}</td>
                        <td class="amount-cell">${this.formatCurrency(balance)}</td>
                    </tr>`;
            }
        });

        // Calculate retained earnings (prior years)
        const priorYearBalances = this.calculateAccountBalances(priorYearTransactions);
        const priorYearRevenue = accounts
            .filter(a => a.accountType.includes('Revenue') || 
                        a.accountType.includes('Sales') || 
                        a.accountType.includes('Other Income'))
            .reduce((total, account) => total + (priorYearBalances[account.id] || 0), 0);
        
        const priorYearExpenses = accounts
            .filter(a => a.accountType.includes('Expense') || 
                        a.accountType.includes('Depreciation'))
            .reduce((total, account) => total + (priorYearBalances[account.id] || 0), 0);

        const retainedEarnings = priorYearRevenue - priorYearExpenses;
        if (retainedEarnings !== 0) {
            totalEquity += retainedEarnings;
            html += `
                <tr>
                    <td class="indent-1">Retained Earnings</td>
                    <td class="amount-cell">${this.formatCurrency(retainedEarnings)}</td>
                </tr>`;
        }

        // Calculate current year earnings
        const currentYearBalances = this.calculateAccountBalances(currentYearTransactions);
        const currentYearRevenue = accounts
            .filter(a => a.accountType.includes('Revenue') || 
                        a.accountType.includes('Sales') || 
                        a.accountType.includes('Other Income'))
            .reduce((total, account) => total + (currentYearBalances[account.id] || 0), 0);
        
        const currentYearExpenses = accounts
            .filter(a => a.accountType.includes('Expense') || 
                        a.accountType.includes('Depreciation'))
            .reduce((total, account) => total + (currentYearBalances[account.id] || 0), 0);

        const currentYearEarnings = currentYearRevenue - currentYearExpenses;
        if (currentYearEarnings !== 0) {
            totalEquity += currentYearEarnings;
            html += `
                <tr>
                    <td class="indent-1">Current Year Earnings</td>
                    <td class="amount-cell">${this.formatCurrency(currentYearEarnings)}</td>
                </tr>`;
        }

        // Verify accounting equation: Assets = Liabilities + Equity
        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
        if (Math.abs(totalAssets - totalLiabilitiesAndEquity) > 0.01) {
            console.warn('Balance sheet is not balanced:', {
                totalAssets,
                totalLiabilitiesAndEquity,
                difference: totalAssets - totalLiabilitiesAndEquity
            });
        }

        html += `
            <tr class="total-row">
                <td>Total Equity</td>
                <td class="amount-cell">${this.formatCurrency(totalEquity)}</td>
            </tr>
            <tr class="total-row">
                <td>Total Liabilities and Equity</td>
                <td class="amount-cell">${this.formatCurrency(totalLiabilitiesAndEquity)}</td>
            </tr>`;

        html += '</tbody></table>';
        this.reportTable.innerHTML = html;
    }

    generateReport() {
        switch (this.reportType.value) {
            case 'balanceSheet':
                this.generateBalanceSheet();
                break;
            case 'profitLoss':
                this.generateProfitLoss();
                break;
            case 'trialBalance':
                this.generateTrialBalance();
                break;
            case 'generalLedger':
                this.generateGeneralLedger();
                break;
            case 'transaction':
                this.generateTransaction();
                break;
        }
    }

    toggleAccountSelector() {
        const accountSelector = document.getElementById('accountSelector');
        accountSelector.style.display = this.reportType.value === 'transaction' ? 'block' : 'none';
    }

    populateAccountSelector() {
        const customSelect = document.querySelector('.custom-select');
        const selectHeader = customSelect.querySelector('.select-header');
        const selectText = customSelect.querySelector('.select-text');
        const dropdown = customSelect.querySelector('.select-dropdown');
        const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        
        // Clear existing content
        dropdown.innerHTML = '';
        
        // Group accounts by type
        const accountsByType = accounts.reduce((acc, account) => {
            if (!acc[account.accountType]) {
                acc[account.accountType] = [];
            }
            acc[account.accountType].push(account);
            return acc;
        }, {});

        // Add grouped checkboxes
        Object.entries(accountsByType).forEach(([type, accounts]) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'account-group';
            
            const groupLabel = document.createElement('div');
            groupLabel.className = 'account-group-label';
            groupLabel.textContent = type;
            groupDiv.appendChild(groupLabel);
            
            accounts
                .sort((a, b) => a.code.localeCompare(b.code))
                .forEach(account => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'account-checkbox-item';
                    
                    const label = document.createElement('label');
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = account.id;
                    checkbox.id = `account-${account.id}`;
                    
                    // Add change event to update header text
                    checkbox.addEventListener('change', () => {
                        const selectedCount = dropdown.querySelectorAll('input[type="checkbox"]:checked').length;
                        if (selectedCount === 0) {
                            selectText.textContent = 'Select accounts...';
                            selectText.style.color = '#666';
                        } else {
                            selectText.textContent = `${selectedCount} account${selectedCount === 1 ? '' : 's'} selected`;
                            selectText.style.color = '#333';
                        }
                    });
                    
                    label.appendChild(checkbox);
                    label.appendChild(document.createTextNode(`${account.code} - ${account.name}`));
                    itemDiv.appendChild(label);
                    groupDiv.appendChild(itemDiv);
                });
            
            dropdown.appendChild(groupDiv);
        });

        // Toggle dropdown on header click
        selectHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            customSelect.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!customSelect.contains(e.target)) {
                customSelect.classList.remove('open');
            }
        });

        // Prevent dropdown from closing when clicking inside
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    generateTransaction() {
        const selectedAccountIds = Array.from(document.querySelectorAll('.account-checkbox-item input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);

        if (selectedAccountIds.length === 0) {
            alert('Please select at least one account');
            return;
        }

        const transactions = this.getTransactionsInRange();
        
        this.reportTitle.textContent = 'Transaction Report';
        this.reportDate.textContent = `${this.formatDate(this.startDate.value)} - ${this.formatDate(this.endDate.value)}`;

        let html = '';
        
        selectedAccountIds.forEach(accountId => {
            const account = this.getAccountById(accountId);
            if (!account) return;

            html += `
                <div class="account-section">
                    <h3>${account.code} - ${account.name}</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th class="amount-cell">Debit</th>
                                <th class="amount-cell">Credit</th>
                                <th class="amount-cell">Balance</th>
                            </tr>
                        </thead>
                        <tbody>`;

            let runningBalance = 0;
            const accountTransactions = transactions
                .filter(t => t.lineItems.some(item => item.accountId === accountId))
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            accountTransactions.forEach(transaction => {
                transaction.lineItems
                    .filter(item => item.accountId === accountId)
                    .forEach(item => {
                        const isDebitNormal = this.isDebitBalance(account.accountType);
                        if (item.type === 'debit') {
                            runningBalance += isDebitNormal ? item.amount : -item.amount;
                        } else {
                            runningBalance += isDebitNormal ? -item.amount : item.amount;
                        }

                        html += `
                            <tr>
                                <td>${this.formatDate(transaction.date)}</td>
                                <td>${transaction.description || ''}</td>
                                <td class="amount-cell">${item.type === 'debit' ? this.formatCurrency(item.amount) : ''}</td>
                                <td class="amount-cell">${item.type === 'credit' ? this.formatCurrency(item.amount) : ''}</td>
                                <td class="amount-cell">${this.formatCurrency(runningBalance)}</td>
                            </tr>`;
                    });
            });

            html += `
                        </tbody>
                    </table>
                </div>`;
        });

        this.reportTable.innerHTML = html;
    }

    generateProfitLoss() {
        const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        const transactions = this.getTransactionsInRange();
        const balances = this.calculateAccountBalances(transactions);
        
        this.reportTitle.textContent = 'Profit & Loss Statement';
        this.reportDate.textContent = `${this.formatDate(this.startDate.value)} - ${this.formatDate(this.endDate.value)}`;

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Account</th>
                        <th class="amount-cell">Amount</th>
                    </tr>
                </thead>
                <tbody>`;

        // Revenue
        html += `<tr class="subtotal-row"><td>Revenue</td><td></td></tr>`;
        let totalRevenue = 0;
        
        accounts
            .filter(a => a.accountType.includes('Revenue') || 
                        a.accountType.includes('Sales') || 
                        a.accountType.includes('Other Income'))
            .forEach(account => {
                const balance = balances[account.id] || 0;
                if (balance !== 0) {
                    totalRevenue += balance;
                    html += `
                        <tr>
                            <td class="indent-1">${account.code} - ${account.name}</td>
                            <td class="amount-cell">${this.formatCurrency(balance)}</td>
                        </tr>`;
                }
            });
        
        html += `
            <tr class="total-row">
                <td>Total Revenue</td>
                <td class="amount-cell">${this.formatCurrency(totalRevenue)}</td>
            </tr>`;

        // Expenses
        html += `<tr class="subtotal-row"><td>Expenses</td><td></td></tr>`;
        let totalExpenses = 0;
        
        accounts
            .filter(a => a.accountType.includes('Expense') || 
                        a.accountType.includes('Depreciation'))
            .forEach(account => {
                const balance = balances[account.id] || 0;
                if (balance !== 0) {
                    totalExpenses += balance;
                    html += `
                        <tr>
                            <td class="indent-1">${account.code} - ${account.name}</td>
                            <td class="amount-cell">${this.formatCurrency(balance)}</td>
                        </tr>`;
                }
            });
        
        html += `
            <tr class="total-row">
                <td>Total Expenses</td>
                <td class="amount-cell">${this.formatCurrency(totalExpenses)}</td>
            </tr>`;

        // Net Income
        const netIncome = totalRevenue - totalExpenses;
        html += `
            <tr class="total-row">
                <td>Net Income</td>
                <td class="amount-cell">${this.formatCurrency(netIncome)}</td>
            </tr>`;

        html += '</tbody></table>';
        this.reportTable.innerHTML = html;
    }

    generateTrialBalance() {
        const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        const transactions = this.getTransactionsInRange();
        const balances = this.calculateAccountBalances(transactions);
        
        this.reportTitle.textContent = 'Trial Balance';
        this.reportDate.textContent = `As of ${this.formatDate(this.asOfDate.value)}`;

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Account</th>
                        <th class="amount-cell">Debit</th>
                        <th class="amount-cell">Credit</th>
                    </tr>
                </thead>
                <tbody>`;

        let totalDebits = 0;
        let totalCredits = 0;

        accounts
            .sort((a, b) => a.code.localeCompare(b.code))
            .forEach(account => {
                const balance = balances[account.id] || 0;
                if (balance !== 0) {
                    const isDebitNormal = this.isDebitBalance(account.accountType);
                    const debitAmount = isDebitNormal ? Math.max(balance, 0) : Math.max(-balance, 0);
                    const creditAmount = isDebitNormal ? Math.max(-balance, 0) : Math.max(balance, 0);
                    
                    totalDebits += debitAmount;
                    totalCredits += creditAmount;

                    html += `
                        <tr>
                            <td>${account.code} - ${account.name}</td>
                            <td class="amount-cell">${debitAmount ? this.formatCurrency(debitAmount) : ''}</td>
                            <td class="amount-cell">${creditAmount ? this.formatCurrency(creditAmount) : ''}</td>
                        </tr>`;
                }
            });

        html += `
            <tr class="total-row">
                <td>Totals</td>
                <td class="amount-cell">${this.formatCurrency(totalDebits)}</td>
                <td class="amount-cell">${this.formatCurrency(totalCredits)}</td>
            </tr>`;

        html += '</tbody></table>';
        this.reportTable.innerHTML = html;
    }

    generateGeneralLedger() {
        const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        const transactions = this.getTransactionsInRange();
        
        this.reportTitle.textContent = 'General Ledger';
        this.reportDate.textContent = `${this.formatDate(this.startDate.value)} - ${this.formatDate(this.endDate.value)}`;

        let html = '';
        
        accounts
            .sort((a, b) => a.code.localeCompare(b.code))
            .forEach(account => {
                const accountTransactions = transactions.filter(t => 
                    t.lineItems.some(item => item.accountId === account.id.toString())
                );

                if (accountTransactions.length > 0) {
                    html += `
                        <div class="account-section">
                            <h3>${account.code} - ${account.name}</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th class="amount-cell">Debit</th>
                                        <th class="amount-cell">Credit</th>
                                        <th class="amount-cell">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>`;

                    let runningBalance = 0;
                    accountTransactions
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .forEach(transaction => {
                            transaction.lineItems
                                .filter(item => item.accountId === account.id.toString())
                                .forEach(item => {
                                    const isDebitNormal = this.isDebitBalance(account.accountType);
                                    if (item.type === 'debit') {
                                        runningBalance += isDebitNormal ? item.amount : -item.amount;
                                    } else {
                                        runningBalance += isDebitNormal ? -item.amount : item.amount;
                                    }

                                    html += `
                                        <tr>
                                            <td>${this.formatDate(transaction.date)}</td>
                                            <td>${transaction.description || ''}</td>
                                            <td class="amount-cell">${item.type === 'debit' ? this.formatCurrency(item.amount) : ''}</td>
                                            <td class="amount-cell">${item.type === 'credit' ? this.formatCurrency(item.amount) : ''}</td>
                                            <td class="amount-cell">${this.formatCurrency(runningBalance)}</td>
                                        </tr>`;
                                });
                        });

                    html += `
                                </tbody>
                            </table>
                        </div>`;
                }
            });

        this.reportTable.innerHTML = html;
    }

    exportToExcel() {
        const wb = XLSX.utils.table_to_book(this.reportTable);
        const fileName = `${this.reportTitle.textContent.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    usesSingleDate() {
        return ['balanceSheet', 'trialBalance'].includes(this.reportType.value);
    }

    toggleDateInputs() {
        const isSingleDate = this.usesSingleDate();
        this.dateRange.style.display = isSingleDate ? 'none' : 'flex';
        this.singleDate.style.display = isSingleDate ? 'block' : 'none';
    }

    getTransactionsInRange() {
        const transactions = JSON.parse(localStorage.getItem('journalEntries')) || [];
        const isSingleDate = this.usesSingleDate();
        
        return transactions.filter(t => {
            const date = new Date(t.date + 'T00:00:00');
            if (isSingleDate) {
                return date <= new Date(this.asOfDate.value + 'T23:59:59');
            } else {
                return date >= new Date(this.startDate.value + 'T00:00:00') && 
                       date <= new Date(this.endDate.value + 'T23:59:59');
            }
        });
    }

    formatDate(dateString) {
        // Add time component to ensure date is interpreted in local timezone
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString();
    }

    calculateAccountBalances(transactions) {
        const balances = {};
        transactions.forEach(transaction => {
            transaction.lineItems.forEach(item => {
                if (!balances[item.accountId]) {
                    balances[item.accountId] = 0;
                }
                
                const account = this.getAccountById(item.accountId);
                if (!account) return;

                // Assets and Expenses increase with debits, decrease with credits
                // Liabilities, Equity, and Revenue increase with credits, decrease with debits
                const isDebitNormal = this.isDebitBalance(account.accountType);
                
                if (item.type === 'debit') {
                    balances[item.accountId] += isDebitNormal ? item.amount : -item.amount;
                } else { // credit
                    balances[item.accountId] += isDebitNormal ? -item.amount : item.amount;
                }
            });
        });
        return balances;
    }

    getAccountById(id) {
        const chartOfAccounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        return chartOfAccounts.find(account => account.id.toString() === id);
    }

    isDebitBalance(accountType) {
        // Assets and Expenses have debit normal balances
        const debitNormalTypes = [
            'Asset', 'Current Asset', 'Non-current Asset', 'Prepayment', 'Bank Account', 'Investment', 'MTM', // Asset types
            'Expense', 'Depreciation' // Expense types
        ];
        return debitNormalTypes.includes(accountType);
        // Note: Liabilities, Equity, and Revenue have credit normal balances
    }

    formatDate(dateString) {
        // Add time component to ensure date is interpreted in local timezone
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
}

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = button.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

class Reconciliation {
    constructor() {
        this.bankAccountSelect = document.getElementById('bankAccountSelect');
        this.startDate = document.getElementById('reconStartDate');
        this.endDate = document.getElementById('reconEndDate');
        this.bankTransactionsBody = document.getElementById('bankTransactionsBody');
        this.bookEntriesBody = document.getElementById('bookEntriesBody');
        this.importBankBtn = document.getElementById('importBankBtn');
        this.exportTemplateBtn = document.getElementById('exportTemplateBtn');
        this.bankTransactionFile = document.getElementById('bankTransactionFile');
        
        this.initializeEventListeners();
        this.populateBankAccounts();
    }

    initializeEventListeners() {
        this.exportTemplateBtn.addEventListener('click', () => {
            this.exportTemplate();
        });

        this.importBankBtn.addEventListener('click', () => {
            this.bankTransactionFile.click();
        });

        this.bankTransactionFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileImport(e.target.files[0]);
            }
        });

        this.bankAccountSelect.addEventListener('change', () => {
            this.loadUnreconciledEntries();
        });

        [this.startDate, this.endDate].forEach(input => {
            input.addEventListener('change', () => {
                if (this.bankAccountSelect.value) {
                    this.loadUnreconciledEntries();
                }
            });
        });
    }

    populateBankAccounts() {
        const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        const bankAccounts = accounts.filter(account => account.accountType === 'Bank Account');
        
        this.bankAccountSelect.innerHTML = '<option value="">Select Bank Account</option>';
        bankAccounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = `${account.code} - ${account.name}`;
            this.bankAccountSelect.appendChild(option);
        });
    }

    exportTemplate() {
        // Create example data
        const data = [
            ['Date', 'Amount', 'Description'],
            ['02/01/2025', 1000.00, 'Customer Payment'],
            ['02/02/2025', -50.00, 'Bank Fee'],
            ['02/03/2025', -500.00, 'Vendor Payment']
        ];

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Add column widths for better readability
        ws['!cols'] = [
            { wch: 12 }, // Date
            { wch: 12 }, // Amount
            { wch: 40 }  // Description
        ];

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Bank Transactions');

        // Save the file
        XLSX.writeFile(wb, 'bank_import_template.xlsx');
    }

    async handleFileImport(file) {
        if (!this.bankAccountSelect.value) {
            alert('Please select a bank account first');
            return;
        }

        try {
            const data = await this.readExcelFile(file);
            if (!this.validateImportData(data)) {
                alert('Invalid file format. The file must contain columns for Date, Amount, and Description.');
                return;
            }

            const bankTransactions = this.processImportData(data);
            await this.saveBankTransactions(bankTransactions);
            await this.generateBookEntries(bankTransactions);
            this.loadUnreconciledEntries();
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing file: ' + error.message);
        }
    }

    readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    validateImportData(data) {
        if (!data || data.length < 2) return false; // Need header row and at least one data row
        
        const headers = data[0].map(h => h.toLowerCase());
        return headers.includes('date') && 
               headers.includes('amount') && 
               headers.includes('description');
    }

    processImportData(data) {
        const headers = data[0].map(h => h.toLowerCase());
        const dateIndex = headers.indexOf('date');
        const amountIndex = headers.indexOf('amount');
        const descriptionIndex = headers.indexOf('description');

        return data.slice(1)
            .filter(row => {
                // Skip rows where required fields are missing
                if (!row[dateIndex] || !row[amountIndex]) {
                    return false;
                }
                // Skip rows where amount is not a valid number
                const amount = parseFloat(row[amountIndex]);
                if (isNaN(amount)) {
                    return false;
                }
                return true;
            })
            .map(row => {
                try {
                    return {
                        date: this.parseExcelDate(row[dateIndex]),
                        amount: parseFloat(row[amountIndex]),
                        description: row[descriptionIndex] || '',
                        bankAccountId: this.bankAccountSelect.value,
                        imported: true,
                        id: Date.now() + Math.random()
                    };
                } catch (error) {
                    console.error('Error processing row:', row, error);
                    return null;
                }
            })
            .filter(transaction => transaction !== null);
    }

    parseExcelDate(value) {
        let date;
        
        if (!value) {
            throw new Error('Date is required');
        }

        try {
            // Handle Excel date serial numbers
            if (typeof value === 'number') {
                date = new Date(Math.round((value - 25569) * 86400 * 1000));
            } else if (typeof value === 'string') {
                // Handle string dates in MM/DD/YYYY format
                const parts = value.split('/');
                if (parts.length === 3) {
                    // parts[0] is month, parts[1] is day, parts[2] is year
                    const month = parseInt(parts[0], 10) - 1;
                    const day = parseInt(parts[1], 10);
                    const year = parseInt(parts[2], 10);
                    
                    // Validate parts
                    if (isNaN(month) || isNaN(day) || isNaN(year)) {
                        throw new Error('Invalid date components');
                    }
                    
                    date = new Date(year, month, day);
                } else {
                    // Try parsing as a regular date string
                    date = new Date(value);
                }
            } else {
                throw new Error('Invalid date value type');
            }
            
            // Validate the date
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date');
            }
            
            // Return in YYYY-MM-DD format for storage
            return date.toISOString().split('T')[0];
        } catch (error) {
            throw new Error(`Invalid date format. Please use MM/DD/YYYY format. Error: ${error.message}`);
        }
    }

    saveBankTransactions(transactions) {
        const existingTransactions = JSON.parse(localStorage.getItem('bankTransactions')) || [];
        const newTransactions = [...existingTransactions, ...transactions];
        localStorage.setItem('bankTransactions', JSON.stringify(newTransactions));
    }

    async generateBookEntries(bankTransactions) {
        const bookEntries = JSON.parse(localStorage.getItem('bookEntries')) || [];
        const newEntries = bankTransactions.map(transaction => ({
            id: Date.now() + Math.random(),
            date: transaction.date,
            description: transaction.description,
            bankAccountId: transaction.bankAccountId,
            amount: transaction.amount,
            bankTransactionId: transaction.id,
            status: 'pending',
            accountId: '', // To be filled by user
            reconciled: false
        }));
        
        bookEntries.push(...newEntries);
        localStorage.setItem('bookEntries', JSON.stringify(bookEntries));
    }

    loadUnreconciledEntries() {
        const accountId = this.bankAccountSelect.value;
        if (!accountId) return;

        const bankTransactions = JSON.parse(localStorage.getItem('bankTransactions')) || [];
        const bookEntries = JSON.parse(localStorage.getItem('bookEntries')) || [];
        const reconciledEntries = JSON.parse(localStorage.getItem('reconciledEntries')) || {};
        
        // Filter by date range if provided
        const startDate = this.startDate.value ? new Date(this.startDate.value) : null;
        const endDate = this.endDate.value ? new Date(this.endDate.value) : null;

        // Filter bank transactions
        const unreconciledBankTransactions = bankTransactions
            .filter(transaction => {
                const transactionDate = new Date(transaction.date);
                const withinDateRange = (!startDate || transactionDate >= startDate) && 
                                      (!endDate || transactionDate <= endDate);
                
                return transaction.bankAccountId === accountId && 
                       !reconciledEntries[transaction.id] &&
                       withinDateRange;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Filter book entries
        const unreconciledBookEntries = bookEntries
            .filter(entry => {
                const entryDate = new Date(entry.date);
                const withinDateRange = (!startDate || entryDate >= startDate) && 
                                      (!endDate || entryDate <= endDate);
                
                return entry.bankAccountId === accountId && 
                       !reconciledEntries[entry.id] &&
                       withinDateRange;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        this.renderBankTransactions(unreconciledBankTransactions);
        this.renderBookEntries(unreconciledBookEntries);
    }

    renderBankTransactions(transactions) {
        this.bankTransactionsBody.innerHTML = '';
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatDate(transaction.date)}</td>
                <td>${transaction.description || ''}</td>
                <td class="amount-cell">${this.formatCurrency(transaction.amount)}</td>
                <td>
                    <button class="reconcile-btn" data-transaction-id="${transaction.id}">Reconcile</button>
                </td>
            `;

            row.querySelector('.reconcile-btn').addEventListener('click', () => {
                this.reconcileEntry(transaction.id, 'bank');
            });

            this.bankTransactionsBody.appendChild(row);
        });
    }

    renderBookEntries(entries) {
        this.bookEntriesBody.innerHTML = '';
        const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        
        entries.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatDate(entry.date)}</td>
                <td>
                    <input type="text" class="description-input" value="${entry.description || ''}" ${entry.reconciled ? 'disabled' : ''}>
                </td>
                <td>
                    <select class="account-select" data-entry-id="${entry.id}" ${entry.reconciled ? 'disabled' : ''}>
                        <option value="">Select Account</option>
                        ${this.generateAccountOptions(accounts, entry.accountId)}
                    </select>
                </td>
                <td class="amount-cell">${this.formatCurrency(entry.amount)}</td>
                <td>
                    ${entry.reconciled ? 
                        '<span class="reconciled-status">Reconciled</span>' :
                        `<button class="reconcile-btn" data-entry-id="${entry.id}">Reconcile</button>`
                    }
                </td>
            `;

            // Add event listeners
            const accountSelect = row.querySelector('.account-select');
            const descriptionInput = row.querySelector('.description-input');

            accountSelect.addEventListener('change', () => {
                this.updateBookEntry(entry.id, { accountId: accountSelect.value });
            });

            descriptionInput.addEventListener('change', () => {
                this.updateBookEntry(entry.id, { description: descriptionInput.value });
            });

            const reconcileBtn = row.querySelector('.reconcile-btn');
            if (reconcileBtn) {
                reconcileBtn.addEventListener('click', () => {
                    if (!accountSelect.value) {
                        alert('Please select an account before reconciling');
                        return;
                    }
                    this.reconcileEntry(entry.id);
                });
            }

            this.bookEntriesBody.appendChild(row);
        });
    }

    generateAccountOptions(accounts, selectedId = '') {
        const accountsByType = accounts.reduce((acc, account) => {
            if (!acc[account.accountType]) {
                acc[account.accountType] = [];
            }
            acc[account.accountType].push(account);
            return acc;
        }, {});

        let options = '';
        Object.entries(accountsByType).forEach(([type, accounts]) => {
            options += `<optgroup label="${type}">`;
            accounts.forEach(account => {
                options += `
                    <option value="${account.id}" ${account.id.toString() === selectedId ? 'selected' : ''}>
                        ${account.code} - ${account.name}
                    </option>`;
            });
            options += '</optgroup>';
        });
        return options;
    }

    updateBookEntry(entryId, updates) {
        const bookEntries = JSON.parse(localStorage.getItem('bookEntries')) || [];
        const index = bookEntries.findIndex(entry => entry.id === entryId);
        if (index !== -1) {
            bookEntries[index] = { ...bookEntries[index], ...updates };
            localStorage.setItem('bookEntries', JSON.stringify(bookEntries));
        }
    }

    reconcileEntry(entryId) {
        const reconciledEntries = JSON.parse(localStorage.getItem('reconciledEntries')) || {};
        reconciledEntries[entryId] = {
            date: new Date().toISOString(),
            bankAccountId: this.bankAccountSelect.value
        };

        // Create journal entry if this is a book entry
        const bookEntries = JSON.parse(localStorage.getItem('bookEntries')) || [];
        const bookEntry = bookEntries.find(entry => entry.id === entryId);
        if (bookEntry && bookEntry.accountId) {
            const journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
            const newEntry = {
                date: bookEntry.date,
                description: bookEntry.description,
                lineItems: [
                    {
                        accountId: this.bankAccountSelect.value,
                        accountName: this.getAccountName(this.bankAccountSelect.value),
                        accountType: 'Bank Account',
                        description: bookEntry.description,
                        type: bookEntry.amount > 0 ? 'debit' : 'credit',
                        amount: Math.abs(bookEntry.amount)
                    },
                    {
                        accountId: bookEntry.accountId,
                        accountName: this.getAccountName(bookEntry.accountId),
                        accountType: this.getAccountType(bookEntry.accountId),
                        description: bookEntry.description,
                        type: bookEntry.amount > 0 ? 'credit' : 'debit',
                        amount: Math.abs(bookEntry.amount)
                    }
                ],
                id: Date.now()
            };
            journalEntries.push(newEntry);
            localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
        }

        localStorage.setItem('reconciledEntries', JSON.stringify(reconciledEntries));
        this.loadUnreconciledEntries();
    }

    getAccountName(accountId) {
        const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        const account = accounts.find(a => a.id.toString() === accountId);
        return account ? `${account.code} - ${account.name}` : '';
    }

    getAccountType(accountId) {
        const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        const account = accounts.find(a => a.id.toString() === accountId);
        return account ? account.accountType : '';
    }

    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const chartOfAccounts = new ChartOfAccounts();
    
    // Create MTM accounts for all existing Investment accounts
    const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
    const investmentAccounts = accounts.filter(account => account.accountType === 'Investment');
    
    investmentAccounts.forEach(account => {
        const mtmCode = account.code + '1';
        const mtmName = account.name + ' - MTM';
        
        // Check if MTM account already exists
        const mtmExists = accounts.some(a => a.code === mtmCode || a.name === mtmName);
        
        if (!mtmExists) {
            const mtmAccount = {
                code: mtmCode,
                name: mtmName,
                accountType: 'MTM',
                description: 'MTM account for ' + account.name,
                id: Date.now() + Math.floor(Math.random() * 1000)
            };
            
            accounts.push(mtmAccount);
        }
    });
    
    // Save updated accounts to localStorage
    localStorage.setItem('chartOfAccounts', JSON.stringify(accounts));
    
    // Refresh the accounts display
    chartOfAccounts.renderAccounts();
    
    new GeneralLedger();
    new Reports();
    new Investments();
    initializeTabs();
    new Reconciliation();
});
