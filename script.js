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
        const lineItems = Array.from(this.lineItemsContainer.children);
        const lineItemsData = lineItems.map(lineItem => {
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

        // Check if this is an investment transaction
        const hasInvestment = lineItemsData.some(item => {
            const account = this.getAccountById(item.accountId);
            return account && account.accountType === 'Investment';
        });

        if (hasInvestment) {
            // For investment transactions, only keep the investment side
            const investmentItem = lineItemsData.find(item => {
                const account = this.getAccountById(item.accountId);
                return account && account.accountType === 'Investment';
            });

            if (!investmentItem) {
                document.getElementById('balance-error').style.display = 'block';
                return;
            }

            const transaction = {
                date: document.getElementById('date').value,
                description: document.getElementById('description').value,
                lineItems: [investmentItem],
                id: Date.now(),
                transactionType: 'investment',
                reconciled: false
            };

            this.transactions.push(transaction);
            this.saveToLocalStorage();
            this.renderLedger();
            this.form.reset();
            this.lineItemsContainer.innerHTML = '';
            this.addLineItemRow();
            this.updateTotals();
            return;
        }

        // For non-investment transactions, proceed with normal validation
        const debitTotal = this.calculateTotal('debit');
        const creditTotal = this.calculateTotal('credit');

        if (debitTotal !== creditTotal) {
            document.getElementById('balance-error').style.display = 'block';
            return;
        }

        // Determine if this is a bank transaction
        const hasBankAccount = lineItemsData.some(item => {
            const account = this.getAccountById(item.accountId);
            return account && account.accountType === 'Bank Account';
        });

        const transaction = {
            date: document.getElementById('date').value,
            description: document.getElementById('description').value,
            lineItems: lineItemsData,
            id: Date.now(),
            transactionType: hasBankAccount ? 'bank' : 'business',
            reconciled: false
        };

        // If this is a bank transaction, create corresponding bank transaction record
        if (hasBankAccount) {
            const bankLineItem = lineItemsData.find(item => 
                this.getAccountById(item.accountId).accountType === 'Bank Account'
            );
            
            if (bankLineItem) {
                const bankTransactions = JSON.parse(localStorage.getItem('bankTransactions')) || [];
                const bankTransaction = {
                    date: transaction.date,
                    amount: bankLineItem.type === 'debit' ? bankLineItem.amount : -bankLineItem.amount,
                    description: transaction.description,
                    bankAccountId: bankLineItem.accountId,
                    imported: false,
                    id: transaction.id // Use same ID for easy reconciliation
                };
                bankTransactions.push(bankTransaction);
                localStorage.setItem('bankTransactions', JSON.stringify(bankTransactions));
            }
        }

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
        this.modal = document.getElementById('companyDetailsModal');
        this.modalCompanyName = document.getElementById('modalCompanyName');
        this.modalBody = document.getElementById('companyDetailsBody');
        this.investmentStatus = {
            ACTIVE: 'Active',
            INACTIVE: 'Inactive',
            EXITED: 'Exited'
        };
        this.initializeEventListeners();
        this.renderInvestments();
        this.initializeInvestmentSubledger();
    }

    initializeInvestmentSubledger() {
        const subledger = JSON.parse(localStorage.getItem('investmentSubledger')) || {};
        if (!subledger.transactions) {
            subledger.transactions = [];
            localStorage.setItem('investmentSubledger', JSON.stringify(subledger));
        }
    }

    initializeEventListeners() {
        // Modal close button
        this.modal.querySelector('.close-modal').addEventListener('click', () => {
            this.hideModal();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.hideModal();
            }
        });

        // Restore SAFE function
        this.restoreSoldSafe = () => {
            const investmentDetails = JSON.parse(localStorage.getItem('investmentDetails')) || {};
            let restored = false;
            
            Object.entries(investmentDetails).forEach(([accountId, rounds]) => {
                Object.entries(rounds).forEach(([date, details]) => {
                    if (details.round === 'SAFE' && details.fmv === 0) {
                        // Remove the fmv property to restore the SAFE
                        delete details.fmv;
                        restored = true;
                    }
                });
            });
            
            if (restored) {
                localStorage.setItem('investmentDetails', JSON.stringify(investmentDetails));
                this.renderInvestments();
            }
        };

        // Automatically restore any sold SAFEs when initializing
        this.restoreSoldSafe();

        // Sell button
        document.getElementById('sellInvestmentBtn').addEventListener('click', () => {
            this.showSellModal();
        });

        // Purchase button
        document.getElementById('newCompanyBtn').addEventListener('click', () => {
            // Show modal with investment type selection
            this.modalCompanyName.textContent = 'New Investment';
            const tableBody = document.getElementById('companyDetailsBody');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="padding: 20px;">
                        <div style="margin-bottom: 20px;">
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 10px;">Investment Type:</label>
                                <div style="display: flex; gap: 20px;">
                                    <label>
                                        <input type="radio" name="investmentType" value="new" checked> New Company
                                    </label>
                                    <label>
                                        <input type="radio" name="investmentType" value="existing"> Add Round to Existing Company
                                    </label>
                                </div>
                            </div>
                            <div id="newCompanyInputs" style="display: flex; gap: 20px; margin-bottom: 20px;">
                                <div>
                                    <label style="display: block; margin-bottom: 5px;">Account Code:</label>
                                    <input type="text" id="newAccountCode" style="width: 100px;" required>
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 5px;">Company Name:</label>
                                    <input type="text" id="newCompanyName" style="width: 200px;" required>
                                </div>
                            </div>
                            <div id="existingCompanyInput" style="margin-bottom: 20px; display: none;">
                                <label style="display: block; margin-bottom: 5px;">Select Company:</label>
                                <select id="existingCompanySelect" style="width: 100%;">
                                    <option value="">Select a company...</option>
                                </select>
                            </div>
                        </div>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th>Round</th>
                                    <th>Tranche</th>
                                    <th>Date</th>
                                    <th>Shares</th>
                                    <th>Cost Basis</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <select id="newRound" style="width: 100%;" required>
                                            <option value="SAFE">SAFE</option>
                                            <option value="Series Seed Preferred">Series Seed Preferred</option>
                                            <option value="Series A Preferred">Series A Preferred</option>
                                            <option value="Series B Preferred">Series B Preferred</option>
                                            <option value="Series C Preferred">Series C Preferred</option>
                                            <option value="Convertible Note">Convertible Note</option>
                                        </select>
                                    </td>
                                    <td>
                                        <input type="text" id="newTranche" style="width: 100%;" placeholder="Tranche (e.g. First Close)">
                                    </td>
                                    <td>
                                        <input type="date" id="newDate" style="width: 100%;" required value="${new Date().toISOString().split('T')[0]}">
                                    </td>
                                    <td>
                                        <input type="number" id="newShares" style="width: 100%;" step="1" min="0">
                                    </td>
                                    <td>
                                        <input type="number" id="newCostBasis" style="width: 100%;" step="0.01" min="0" required>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div style="margin-top: 20px; text-align: right;">
                            <button id="createCompanyBtn" class="save-btn">Purchase</button>
                            <button class="cancel-btn">Cancel</button>
                        </div>
                    </td>
                </tr>
            `;

            // Add event listeners for investment type selection
            const radioButtons = tableBody.querySelectorAll('input[name="investmentType"]');
            const newCompanyInputs = tableBody.querySelector('#newCompanyInputs');
            const existingCompanyInput = tableBody.querySelector('#existingCompanyInput');
            const existingCompanySelect = tableBody.querySelector('#existingCompanySelect');
            const createBtn = tableBody.querySelector('#createCompanyBtn');
            const cancelBtn = tableBody.querySelector('.cancel-btn');
            const codeInput = tableBody.querySelector('#newAccountCode');
            const nameInput = tableBody.querySelector('#newCompanyName');

            // Populate existing company select
            const investmentAccounts = this.getInvestmentAccounts();
            investmentAccounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.code} - ${account.name}`;
                existingCompanySelect.appendChild(option);
            });

            // Add radio button change handler
            radioButtons.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.value === 'new') {
                        newCompanyInputs.style.display = 'flex';
                        existingCompanyInput.style.display = 'none';
                        createBtn.textContent = 'Create Company';
                    } else {
                        newCompanyInputs.style.display = 'none';
                        existingCompanyInput.style.display = 'block';
                        createBtn.textContent = 'Add Round';
                    }
                });
            });

            createBtn.addEventListener('click', () => {
                const selectedType = tableBody.querySelector('input[name="investmentType"]:checked').value;
                const round = document.getElementById('newRound').value;
                const date = document.getElementById('newDate').value;
                const shares = parseFloat(document.getElementById('newShares').value) || null;
                const costBasis = parseFloat(document.getElementById('newCostBasis').value);

                if (!costBasis) {
                    alert('Please enter cost basis');
                    return;
                }

                if (selectedType === 'new') {
                    // Create new company
                    const code = codeInput.value.trim();
                    const name = nameInput.value.trim();

                    if (!code || !name) {
                        alert('Please enter account code and company name');
                        return;
                    }

                    // Get selected round type
                    const roundType = document.getElementById('newRound').value;
                    const sharesRequired = !['SAFE', 'Convertible Note'].includes(roundType);
                    const shares = parseFloat(document.getElementById('newShares').value);

                    // Validate shares if required for this round type
                    if (sharesRequired && !shares) {
                        alert('Please enter number of shares');
                        return;
                    }

                    const chartOfAccounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
                    
                    // Validate account code and name
                    const existingCode = chartOfAccounts.find(a => a.code === code);
                    if (existingCode) {
                        alert('An account with this code already exists');
                        return;
                    }

                    const existingName = chartOfAccounts.find(a => a.name === name);
                    if (existingName) {
                        alert('An account with this name already exists');
                        return;
                    }

                    // Create new investment account
                    const newAccount = {
                        code: code,
                        name: name,
                        accountType: 'Investment',
                        description: '',
                        id: Date.now()
                    };

                    // Create corresponding MTM account
                    const mtmAccount = {
                        code: code + '1',
                        name: name + ' - MTM',
                        accountType: 'MTM',
                        description: 'MTM account for ' + name,
                        id: Date.now() + 1
                    };

                    chartOfAccounts.push(newAccount, mtmAccount);
                    localStorage.setItem('chartOfAccounts', JSON.stringify(chartOfAccounts));

                    // Create initial transaction
                    const journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
                    const transaction = {
                        date: date,
                        description: `Initial investment in ${name} - ${round}`,
                        lineItems: [
                            {
                                accountId: newAccount.id.toString(),
                                accountName: `${code} - ${name}`,
                                accountType: 'Investment',
                                description: `Initial investment - ${round}`,
                                type: 'debit',
                                amount: costBasis
                            }
                        ],
                        id: Date.now(),
                        transactionType: 'investment',
                        reconciled: false
                    };
                    journalEntries.push(transaction);
                    localStorage.setItem('journalEntries', JSON.stringify(journalEntries));

                    // Store investment details
                    const investmentDetails = JSON.parse(localStorage.getItem('investmentDetails')) || {};
                    if (!investmentDetails[newAccount.id]) {
                        investmentDetails[newAccount.id] = {};
                    }
                    investmentDetails[newAccount.id][date] = {
                        round: round,
                        tranche: document.getElementById('newTranche').value.trim(),
                        shares: shares,
                        fmv: costBasis,
                        fmvPerShare: shares ? costBasis / shares : null
                    };
                    localStorage.setItem('investmentDetails', JSON.stringify(investmentDetails));

                    // Hide modal and refresh view
                    this.hideModal();
                    this.renderInvestments();
                } else {
                    // Add round to existing company
                    const accountId = existingCompanySelect.value;
                    if (!accountId) {
                        alert('Please select a company');
                        return;
                    }

                    const account = this.getInvestmentAccounts().find(a => a.id.toString() === accountId);
                    if (!account) {
                        alert('Selected company not found');
                        return;
                    }

                    // Create new transaction for the round
                    const journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
                    const transaction = {
                        date: date,
                        description: `Additional investment in ${account.name} - ${round}`,
                        lineItems: [
                            {
                                accountId: account.id.toString(),
                                accountName: `${account.code} - ${account.name}`,
                                accountType: 'Investment',
                                description: `Additional investment - ${round}`,
                                type: 'debit',
                                amount: costBasis
                            }
                        ],
                        id: Date.now(),
                        transactionType: 'investment',
                        reconciled: false
                    };
                    journalEntries.push(transaction);
                    localStorage.setItem('journalEntries', JSON.stringify(journalEntries));

                    // Store investment details
                    const investmentDetails = JSON.parse(localStorage.getItem('investmentDetails')) || {};
                    if (!investmentDetails[account.id]) {
                        investmentDetails[account.id] = {};
                    }
                    investmentDetails[account.id][date] = {
                        round: round,
                        tranche: document.getElementById('newTranche').value.trim(),
                        shares: shares,
                        fmv: costBasis,
                        fmvPerShare: shares ? costBasis / shares : null
                    };
                    localStorage.setItem('investmentDetails', JSON.stringify(investmentDetails));

                    // Hide modal and refresh view
                    this.hideModal();
                    this.renderInvestments();
                }
            });

            cancelBtn.addEventListener('click', () => {
                this.hideModal();
            });

            // Show the modal
            this.showModal();
        });
    }

    showModal() {
        this.modal.style.display = 'block';
    }

    hideModal() {
        this.modal.style.display = 'none';
    }

    showSellModal() {
        // Show modal with company selection
        this.modalCompanyName.textContent = 'Sell Investment';
        const tableBody = document.getElementById('companyDetailsBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="padding: 20px;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px;">Select Company:</label>
                        <select id="sellCompanySelect" style="width: 100%;">
                            <option value="">Select a company...</option>
                        </select>
                    </div>
                    <div id="sellDetails" style="display: none;">
                        <div style="margin-bottom: 20px;">
                            <h3>Investment Rounds:</h3>
                            <div id="roundsList" style="margin-bottom: 15px;"></div>
                        </div>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Shares to Sell</th>
                                    <th>Sale Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <input type="date" id="sellDate" style="width: 100%;" required value="${new Date().toISOString().split('T')[0]}">
                                    </td>
                                    <td>
                                        <input type="number" id="sellShares" style="width: 100%;" step="1" min="0" readonly>
                                    </td>
                                    <td>
                                        <input type="number" id="sellPrice" style="width: 100%;" step="0.01" min="0" required>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div id="sellSummary" style="margin-top: 20px;">
                            <p>Total Shares Owned: <span id="totalShares">0</span></p>
                            <p>Average Cost Basis: <span id="avgCostBasis">$0.00</span></p>
                            <p>Total Sale Amount: <span id="totalSaleAmount">$0.00</span></p>
                            <p>Realized Gain/Loss: <span id="realizedGainLoss">$0.00</span></p>
                        </div>
                    </div>
                    <div style="margin-top: 20px; text-align: right;">
                        <button id="sellConfirmBtn" class="save-btn" style="display: none;">Sell</button>
                        <button class="cancel-btn">Cancel</button>
                    </div>
                </td>
            </tr>
        `;

        // Populate company select
        const sellCompanySelect = document.getElementById('sellCompanySelect');
        const investmentAccounts = this.getInvestmentAccounts();
        const investmentDetails = JSON.parse(localStorage.getItem('investmentDetails')) || {};
        
        investmentAccounts.forEach(account => {
            const { transactions } = this.getTransactionsForAccount(account.id);
            // Check if there are any active investments (either transactions with remaining shares or active SAFEs)
            const hasActiveInvestments = transactions.some(transaction => {
                const details = investmentDetails[account.id]?.[transaction.date];
                // Include if it's a SAFE/Note that hasn't been sold (fmv is undefined or non-zero), or if there are remaining shares
                return details && (
                    (['SAFE', 'Convertible Note'].includes(details.round) && details.fmv !== 0) ||
                    (details.shares && details.shares > 0) ||
                    (['SAFE', 'Convertible Note'].includes(details.round) && details.fmv === undefined)
                );
            });
            
            if (hasActiveInvestments) {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.code} - ${account.name}`;
                sellCompanySelect.appendChild(option);
            }
        });

        // Add event listeners
        const sellDetails = document.getElementById('sellDetails');
        const sellConfirmBtn = document.getElementById('sellConfirmBtn');
        const sellShares = document.getElementById('sellShares');
        const sellPrice = document.getElementById('sellPrice');
        const totalShares = document.getElementById('totalShares');
        const avgCostBasis = document.getElementById('avgCostBasis');
        const totalSaleAmount = document.getElementById('totalSaleAmount');
        const realizedGainLoss = document.getElementById('realizedGainLoss');

        sellCompanySelect.addEventListener('change', () => {
            if (sellCompanySelect.value) {
                const account = investmentAccounts.find(a => a.id.toString() === sellCompanySelect.value);
                const { transactions } = this.getTransactionsForAccount(account.id);
                const investmentDetails = JSON.parse(localStorage.getItem('investmentDetails')) || {};
                
                // Calculate total shares and average cost basis
                let totalSharesOwned = 0;
                let totalCost = 0;
                
                // Generate rounds list with purchase dates
                const roundsList = document.getElementById('roundsList');
                roundsList.innerHTML = '';
                
                transactions.forEach((transaction, index) => {
                    const details = investmentDetails[account.id]?.[transaction.date] || {};
                    totalCost += transaction.amount;
                    
                    const roundDiv = document.createElement('div');
                    roundDiv.className = 'round-option';
                    roundDiv.style.marginBottom = '10px';
                    
                    if (details.round && ['SAFE', 'Convertible Note'].includes(details.round)) {
                        // Handle SAFE and Convertible Note rounds
                        roundDiv.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" 
                                    id="roundSelect${index}" 
                                    class="round-select"
                                    data-cost="${transaction.amount}"
                                    data-type="${details.round}">
                                <label>
                                    ${details.round}: ${this.formatCurrency(transaction.amount)}
                                    (Purchased: ${this.formatDate(transaction.date)})
                                </label>
                            </div>
                        `;
                    } else if (details.shares) {
                        // Handle equity rounds with shares
                        totalSharesOwned += details.shares;
                        roundDiv.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="number" 
                                    id="roundShares${index}" 
                                    class="round-shares" 
                                    min="0" 
                                    max="${details.shares}" 
                                    value="0" 
                                    style="width: 80px;"
                                    data-original-shares="${details.shares}"
                                    data-cost="${transaction.amount / details.shares}">
                                <label>
                                    ${details.round || `Round ${index + 1}`}: ${details.shares.toLocaleString()} shares 
                                    @ ${this.formatCurrency(transaction.amount / details.shares)} each
                                    (Purchased: ${this.formatDate(transaction.date)})
                                </label>
                            </div>
                        `;
                    }
                    roundsList.appendChild(roundDiv);
                });

                const averageCostBasis = totalSharesOwned ? totalCost / totalSharesOwned : 0;
                
                // Update display
                totalShares.textContent = totalSharesOwned.toLocaleString();
                avgCostBasis.textContent = this.formatCurrency(averageCostBasis);
                
                // Show sell details
                sellDetails.style.display = 'block';
                sellConfirmBtn.style.display = 'block';
                
                // Update totals when round shares, checkboxes, or price changes
                const updateTotals = () => {
                    let totalSelectedShares = 0;
                    let weightedCostBasis = 0;
                    let hasSAFEOrNote = false;
                    
                    // Handle equity rounds
                    document.querySelectorAll('.round-shares').forEach(input => {
                        const shares = parseInt(input.value) || 0;
                        const costPerShare = parseFloat(input.dataset.cost);
                        totalSelectedShares += shares;
                        weightedCostBasis += shares * costPerShare;
                    });
                    
                    // Handle SAFE and Convertible Note rounds
                    document.querySelectorAll('.round-select').forEach(checkbox => {
                        if (checkbox.checked) {
                            const cost = parseFloat(checkbox.dataset.cost);
                            weightedCostBasis += cost;
                            hasSAFEOrNote = true;
                        }
                    });
                    
                    const price = parseFloat(sellPrice.value) || 0;
                    const saleAmount = hasSAFEOrNote ? price : totalSelectedShares * price;
                    const gainLoss = saleAmount - weightedCostBasis;
                    
                    // Update the readonly total shares field
                    if (hasSAFEOrNote) {
                        sellShares.value = 'N/A';
                        sellShares.disabled = true;
                    } else {
                        sellShares.value = totalSelectedShares;
                        sellShares.disabled = false;
                    }
                    
                    totalSaleAmount.textContent = this.formatCurrency(saleAmount);
                    realizedGainLoss.textContent = this.formatCurrency(gainLoss);
                    realizedGainLoss.style.color = gainLoss >= 0 ? 'green' : 'red';
                };
                
                // Add event listeners for round share inputs and checkboxes
                document.querySelectorAll('.round-shares').forEach(input => {
                    input.addEventListener('input', (e) => {
                        const max = parseInt(e.target.dataset.originalShares);
                        if (parseInt(e.target.value) > max) {
                            e.target.value = max;
                        }
                        updateTotals();
                    });
                });
                
                document.querySelectorAll('.round-select').forEach(checkbox => {
                    checkbox.addEventListener('change', updateTotals);
                });
                
                sellPrice.addEventListener('input', updateTotals);
            } else {
                sellDetails.style.display = 'none';
                sellConfirmBtn.style.display = 'none';
            }
        });

        sellConfirmBtn.addEventListener('click', () => {
            const accountId = sellCompanySelect.value;
            const totalShares = parseFloat(sellShares.value);
            const price = parseFloat(sellPrice.value);
            const date = document.getElementById('sellDate').value;
            
            if (!accountId || totalShares === 0 || !price || !date) {
                alert('Please fill in all fields and select shares to sell');
                return;
            }
            
            const account = investmentAccounts.find(a => a.id.toString() === accountId);
            const { transactions } = this.getTransactionsForAccount(account.id);
            const investmentDetails = JSON.parse(localStorage.getItem('investmentDetails')) || {};
            
            // Collect rounds being sold
            const roundSales = [];
            let totalCostBasis = 0;
            let hasSAFEOrNote = false;
            
            // Check for SAFE and Convertible Note rounds
            document.querySelectorAll('.round-select').forEach((checkbox, index) => {
                if (checkbox.checked) {
                    const details = investmentDetails[account.id]?.[transactions[index].date] || {};
                    const roundCost = parseFloat(checkbox.dataset.cost);
                    totalCostBasis += roundCost;
                    hasSAFEOrNote = true;
                    
                    roundSales.push({
                        date: transactions[index].date,
                        shares: null,
                        costBasis: roundCost,
                        details: details,
                        type: checkbox.dataset.type
                    });
                }
            });
            
            // Check for equity rounds
            document.querySelectorAll('.round-shares').forEach((input, index) => {
                const sharesToSell = parseInt(input.value) || 0;
                if (sharesToSell > 0) {
                    const details = investmentDetails[account.id]?.[transactions[index].date] || {};
                    if (sharesToSell > details.shares) {
                        alert(`Cannot sell more shares than available in round ${index + 1}`);
                        return;
                    }
                    
                    const costPerShare = transactions[index].amount / details.shares;
                    const roundCost = sharesToSell * costPerShare;
                    totalCostBasis += roundCost;
                    
                    roundSales.push({
                        date: transactions[index].date,
                        shares: sharesToSell,
                        costBasis: roundCost,
                        details: details,
                        type: 'equity'
                    });
                }
            });
            
            if (roundSales.length === 0) {
                alert('Please select at least one round to sell');
                return;
            }
            
            // Calculate realized gain/loss
            const saleAmount = hasSAFEOrNote ? price : totalShares * price;
            const realizedGainLoss = saleAmount - totalCostBasis;
            
            // Create journal entries
            const journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
            
            // 1. Record the sale and proceeds
            const saleEntry = {
                date: date,
                description: `Sale of ${totalShares} shares of ${account.name}`,
                lineItems: [
                    {
                        accountId: account.id.toString(),
                        accountName: `${account.code} - ${account.name}`,
                        accountType: 'Investment',
                        description: 'Investment sale',
                        type: 'credit',
                        amount: totalCostBasis
                    },
                    {
                        accountId: 'CASH', // Placeholder - will be reconciled later
                        accountName: 'Cash',
                        accountType: 'Bank Account',
                        description: 'Sale proceeds',
                        type: 'debit',
                        amount: saleAmount
                    }
                ],
                id: Date.now(),
                transactionType: 'investment',
                reconciled: false
            };
            
            // 2. Record realized gain/loss
            if (Math.abs(realizedGainLoss) > 0.01) {
                const gainLossAccount = this.getOrCreateGainLossAccount();
                
                // Add realized gain/loss to the sale entry
                saleEntry.lineItems.push({
                    accountId: gainLossAccount.id.toString(),
                    accountName: `${gainLossAccount.code} - ${gainLossAccount.name}`,
                    accountType: gainLossAccount.accountType,
                    description: 'Realized gain/loss on investment sale',
                    type: realizedGainLoss > 0 ? 'credit' : 'debit',
                    amount: Math.abs(realizedGainLoss)
                });
            }
            
            journalEntries.push(saleEntry);
            localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
            
            // Update investment details for each affected round
            roundSales.forEach(sale => {
                const originalDetails = sale.details;
                
                if (!investmentDetails[account.id]) {
                    investmentDetails[account.id] = {};
                }
                
                if (sale.type === 'equity') {
                    const remainingShares = originalDetails.shares - sale.shares;
                    const remainingCost = (remainingShares / originalDetails.shares) * sale.costBasis;
                    
                    if (remainingShares > 0) {
                        // Update existing round with remaining shares and cost basis
                        investmentDetails[account.id][sale.date] = {
                            ...originalDetails,
                            shares: remainingShares,
                            fmv: remainingShares * price,
                            fmvPerShare: price,
                            costBasis: remainingCost
                        };
                    } else {
                        // Remove the round if no shares remain
                        delete investmentDetails[account.id][sale.date];
                    }
                } else {
                    // For SAFE/Note, mark it as sold by setting fmv to 0
                    investmentDetails[account.id][sale.date] = {
                        ...sale.details,
                        fmv: 0
                    };
                }
            });
            
            localStorage.setItem('investmentDetails', JSON.stringify(investmentDetails));
            
            this.hideModal();
            this.renderInvestments();
        });

        document.querySelector('.cancel-btn').addEventListener('click', () => {
            this.hideModal();
        });

        this.showModal();
    }

    getOrCreateGainLossAccount() {
        const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        let gainLossAccount = accounts.find(a => 
            a.accountType === 'Revenue' && 
            a.code === 'RGL' && 
            a.name === 'Realized Gain/Loss'
        );
        
        if (!gainLossAccount) {
            gainLossAccount = {
                code: 'RGL',
                name: 'Realized Gain/Loss',
                accountType: 'Revenue',
                description: 'Account for recording realized gains and losses on investments',
                id: Date.now() + Math.floor(Math.random() * 1000)
            };
            accounts.push(gainLossAccount);
            localStorage.setItem('chartOfAccounts', JSON.stringify(accounts));
        }
        
        return gainLossAccount;
    }

    showCompanyDetails(account) {
        const { transactions } = this.getTransactionsForAccount(account.id);
        const investmentDetails = JSON.parse(localStorage.getItem('investmentDetails')) || {};
        
        // Set modal title
        this.modalCompanyName.textContent = account.name;

        // Clear existing content in the table body
        const tableBody = document.getElementById('companyDetailsBody');
        tableBody.innerHTML = '';

        // Add rows for each transaction
        transactions.forEach(transaction => {
            const details = investmentDetails[account.id]?.[transaction.date] || {};
            const cost = transaction.amount;
            const shares = details.shares;
            const costPerShare = shares ? cost / shares : null;
            const fmvPerShare = details.fmvPerShare;
            const fmv = details.fmv || cost;
            const unrealizedGainLoss = fmv - cost;

            const row = document.createElement('tr');
            const isEditing = this.editingRowId === `${account.id}-${transaction.date}`;
            
            if (isEditing) {
                row.innerHTML = `
                    <td>
                        <select class="edit-round">
                            <option value="SAFE" ${details.round === "SAFE" ? "selected" : ""}>SAFE</option>
                            <option value="Series Seed Preferred" ${details.round === "Series Seed Preferred" ? "selected" : ""}>Series Seed Preferred</option>
                            <option value="Series A Preferred" ${details.round === "Series A Preferred" ? "selected" : ""}>Series A Preferred</option>
                            <option value="Series B Preferred" ${details.round === "Series B Preferred" ? "selected" : ""}>Series B Preferred</option>
                            <option value="Series C Preferred" ${details.round === "Series C Preferred" ? "selected" : ""}>Series C Preferred</option>
                            <option value="Convertible Note" ${details.round === "Convertible Note" ? "selected" : ""}>Convertible Note</option>
                        </select>
                    </td>
                    <td>${this.formatDate(transaction.date)}</td>
                    <td class="amount-cell">
                        <input type="number" class="edit-shares" value="${shares || ''}" step="1">
                    </td>
                    <td class="amount-cell">${costPerShare ? this.formatCurrency(costPerShare) : ''}</td>
                    <td class="amount-cell">
                        <input type="number" class="edit-fmv-per-share" value="${fmvPerShare || ''}" step="0.01">
                    </td>
                    <td class="amount-cell">${this.formatCurrency(cost)}</td>
                    <td class="amount-cell">
                        <input type="number" class="edit-fmv" value="${fmv}" step="0.01">
                    </td>
                    <td class="amount-cell ${unrealizedGainLoss >= 0 ? 'positive' : 'negative'}">
                        ${this.formatCurrency(unrealizedGainLoss)}
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
                    const shares = parseFloat(sharesInput.value);
                    if (!shares || shares === 0) {
                        fmvPerShareInput.value = '';
                        fmvInput.value = cost.toFixed(2);
                    } else {
                        const fmvPerShare = parseFloat(fmvPerShareInput.value) || 0;
                        fmvInput.value = (shares * fmvPerShare).toFixed(2);
                    }
                });

                fmvPerShareInput.addEventListener('input', () => {
                    const shares = parseFloat(sharesInput.value);
                    if (!shares || shares === 0) {
                        fmvInput.value = cost.toFixed(2);
                    } else {
                        const fmvPerShare = parseFloat(fmvPerShareInput.value) || 0;
                        fmvInput.value = (shares * fmvPerShare).toFixed(2);
                    }
                });

                fmvInput.addEventListener('input', () => {
                    const shares = parseFloat(sharesInput.value);
                    if (!shares || shares === 0) {
                        fmvPerShareInput.value = '';
                    } else {
                        const fmv = parseFloat(fmvInput.value) || 0;
                        fmvPerShareInput.value = (fmv / shares).toFixed(2);
                    }
                });

                // Add save and cancel handlers
                row.querySelector('.save-btn').addEventListener('click', () => {
                    const newDetails = {
                        round: row.querySelector('.edit-round').value,
                        shares: parseFloat(row.querySelector('.edit-shares').value) || null,
                        fmvPerShare: parseFloat(row.querySelector('.edit-fmv-per-share').value) || null,
                        fmv: parseFloat(row.querySelector('.edit-fmv').value) || cost
                    };

                    if (!investmentDetails[account.id]) {
                        investmentDetails[account.id] = {};
                    }
                    investmentDetails[account.id][transaction.date] = newDetails;

                    // Save to localStorage
                    localStorage.setItem('investmentDetails', JSON.stringify(investmentDetails));

                    // Reset editing state
                    this.editingRowId = null;

                    // Update both the modal and main investment table
                    this.showCompanyDetails(account);
                    this.renderInvestments();
                });

                row.querySelector('.cancel-btn').addEventListener('click', () => {
                    this.editingRowId = null;
                    this.showCompanyDetails(account);
                });
            } else {
                row.innerHTML = `
                    <td>${details.round || ''}</td>
                    <td>${this.formatDate(transaction.date)}</td>
                    <td class="amount-cell">
                        ${details.round && ['SAFE', 'Convertible Note'].includes(details.round) ? 'N/A' : 
                          shares ? shares.toLocaleString() : ''}
                    </td>
                    <td class="amount-cell">
                        ${details.round && ['SAFE', 'Convertible Note'].includes(details.round) ? 'N/A' : 
                          costPerShare ? this.formatCurrency(costPerShare) : ''}
                    </td>
                    <td class="amount-cell">
                        ${details.round && ['SAFE', 'Convertible Note'].includes(details.round) ? 'N/A' : 
                          fmvPerShare ? this.formatCurrency(fmvPerShare) : ''}
                    </td>
                    <td class="amount-cell">${this.formatCurrency(cost)}</td>
                    <td class="amount-cell">${this.formatCurrency(fmv)}</td>
                    <td class="amount-cell ${unrealizedGainLoss >= 0 ? 'positive' : 'negative'}">
                        ${this.formatCurrency(unrealizedGainLoss)}
                    </td>
                    <td>
                        <button class="edit-btn">Edit</button>
                    </td>
                `;

                // Add edit handler
                row.querySelector('.edit-btn').addEventListener('click', () => {
                    this.editingRowId = `${account.id}-${transaction.date}`;
                    this.showCompanyDetails(account);
                });
            }
            
            document.getElementById('companyDetailsBody').appendChild(row);
        });

        // Display the modal
        this.modal.style.display = 'block';
    }

    generateEditingRow(account, transaction, shares, costPerShare, fmvPerShare, cost, fmv, details) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="edit-company" value="${account.name}"></td>
            <td>${new Date(transaction.date).toLocaleDateString()}</td>
            <td>
                <select class="edit-round">
                    <option value="SAFE" ${details.round === "SAFE" ? "selected" : ""}>SAFE</option>
                    <option value="Series Seed Preferred" ${details.round === "Series Seed Preferred" ? "selected" : ""}>Series Seed Preferred</option>
                    <option value="Series A Preferred" ${details.round === "Series A Preferred" ? "selected" : ""}>Series A Preferred</option>
                    <option value="Series B Preferred" ${details.round === "Series B Preferred" ? "selected" : ""}>Series B Preferred</option>
                    <option value="Series C Preferred" ${details.round === "Series C Preferred" ? "selected" : ""}>Series C Preferred</option>
                    <option value="Convertible Note" ${details.round === "Convertible Note" ? "selected" : ""}>Convertible Note</option>
                </select>
            </td>
            <td class="amount-cell"><input type="number" class="edit-shares" value="${shares || ''}"></td>
            <td class="amount-cell">${shares ? this.formatCurrency(costPerShare) : ''}</td>
            <td class="amount-cell"><input type="number" step="0.01" class="edit-fmv-per-share" value="${fmvPerShare || ''}"></td>
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
            const shares = parseFloat(sharesInput.value);
            if (!shares || shares === 0) {
                fmvPerShareInput.value = '';
                fmvInput.value = cost.toFixed(2); // Set FMV equal to cost
            } else {
                const fmvPerShare = parseFloat(fmvPerShareInput.value) || 0;
                fmvInput.value = (shares * fmvPerShare).toFixed(2);
            }
        });

        fmvPerShareInput.addEventListener('input', () => {
            const shares = parseFloat(sharesInput.value);
            if (!shares || shares === 0) {
                fmvInput.value = cost.toFixed(2); // Set FMV equal to cost
            } else {
                const fmvPerShare = parseFloat(fmvPerShareInput.value) || 0;
                fmvInput.value = (shares * fmvPerShare).toFixed(2);
            }
        });

        fmvInput.addEventListener('input', () => {
            const shares = parseFloat(sharesInput.value);
            if (!shares || shares === 0) {
                fmvPerShareInput.value = '';
            } else {
                const fmv = parseFloat(fmvInput.value) || 0;
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
        // Check if this is a modal edit
        const isModalEdit = row.closest('#companyDetailsModal');
        
        // For modal edits, we don't need the company name as it can't be changed in the modal
        const newCompany = isModalEdit ? account.name : row.querySelector('.edit-company').value.trim();
        const newRound = row.querySelector('.edit-round').value.trim();
        const sharesInput = row.querySelector('.edit-shares').value.trim();
        const newShares = sharesInput ? parseFloat(sharesInput) : null;
        const newFmvPerShare = newShares ? parseFloat(row.querySelector('.edit-fmv-per-share').value) || 0 : null;
        const newFmv = parseFloat(row.querySelector('.edit-fmv').value) || 0;
        const cost = transaction.amount || parseFloat(row.querySelector('.edit-fmv').value) || 0;

        // Create a new journal entry if this is a new investment (not applicable for modal edits)
        if (!isModalEdit && transaction.amount === 0) {
            const journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
            const newEntry = {
                date: transaction.date,
                description: `Initial investment in ${account.name}`,
                lineItems: [
                    {
                        accountId: account.id.toString(),
                        accountName: `${account.code} - ${account.name}`,
                        accountType: 'Investment',
                        description: `Initial investment - ${newRound}`,
                        type: 'debit',
                        amount: cost
                    },
                    {
                        accountId: 'CASH', // Placeholder - user will need to reconcile
                        accountName: 'Cash',
                        accountType: 'Bank Account',
                        description: `Initial investment in ${account.name}`,
                        type: 'credit',
                        amount: cost
                    }
                ],
                id: Date.now()
            };
            journalEntries.push(newEntry);
            localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
            transaction.amount = cost; // Update the transaction amount for MTM calculation
        }

        const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        
        // Update account names if company name changed (not applicable for modal edits)
        if (!isModalEdit && newCompany !== account.name) {
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
        
        // If this was a modal edit, refresh the modal view
        if (isModalEdit) {
            this.showCompanyDetails(account);
        }
        
        // Always refresh the main investments table
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
        const journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
        
        // Group transactions by company
        const companiesData = {};
        
        investmentAccounts.forEach(account => {
            companiesData[account.id] = {
                name: account.name,
                purchases: [],
                sales: []
            };
            
            // Get all transactions for this account
            const accountTransactions = journalEntries.filter(entry => 
                entry.lineItems.some(item => item.accountId === account.id.toString())
            );
            
            accountTransactions.forEach(transaction => {
                const lineItem = transaction.lineItems.find(item => 
                    item.accountId === account.id.toString()
                );
                
                const details = investmentDetails[account.id]?.[transaction.date] || {};
                const amount = lineItem.type === 'debit' ? lineItem.amount : -lineItem.amount;
                
                const transactionData = {
                    date: transaction.date,
                    description: transaction.description,
                    round: details.round || '',
                    tranche: details.tranche || '',
                    shares: details.shares,
                    amount: Math.abs(amount),
                    pricePerShare: details.shares ? Math.abs(amount) / details.shares : null,
                    details: details
                };
                
                // Determine if this is a purchase or sale based on the amount direction
                if (amount > 0) {
                    companiesData[account.id].purchases.push(transactionData);
                } else {
                    companiesData[account.id].sales.push(transactionData);
                }
            });
        });
        
        // Render transactions grouped by company
        Object.entries(companiesData).forEach(([accountId, data]) => {
            if (data.purchases.length === 0 && data.sales.length === 0) {
                return; // Skip companies with no transactions
            }
            
            // Company header
            const headerRow = document.createElement('tr');
            headerRow.className = 'company-header';
            headerRow.innerHTML = `
                <td colspan="10" class="company-name" style="cursor: pointer; background-color: #f0f0f0; padding: 10px;">
                    <strong>${data.name}</strong>
                </td>
            `;
            
            headerRow.querySelector('.company-name').addEventListener('click', () => {
                this.showCompanyDetails(this.getInvestmentAccounts().find(a => a.id.toString() === accountId));
            });
            
            this.investmentsBody.appendChild(headerRow);
            
            // Purchases section
            if (data.purchases.length > 0) {
                const purchaseHeader = document.createElement('tr');
                purchaseHeader.innerHTML = `
                    <td colspan="10" style="background-color: #e8f4e8; padding: 5px 10px;">
                        <strong>Purchases</strong>
                    </td>
                `;
                this.investmentsBody.appendChild(purchaseHeader);
                
                let totalPurchaseAmount = 0;
                let totalPurchaseShares = 0;
                
                data.purchases
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .forEach(purchase => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td style="padding-left: 20px;">${this.formatDate(purchase.date)}</td>
                            <td>${purchase.round}</td>
                            <td>${purchase.tranche}</td>
                            <td class="amount-cell">
                                ${purchase.round && ['SAFE', 'Convertible Note'].includes(purchase.round) ? 'N/A' : 
                                  purchase.shares ? purchase.shares.toLocaleString() : ''}
                            </td>
                            <td class="amount-cell">
                                ${purchase.round && ['SAFE', 'Convertible Note'].includes(purchase.round) ? 'N/A' : 
                                  purchase.pricePerShare ? this.formatCurrency(purchase.pricePerShare) : ''}
                            </td>
                            <td class="amount-cell">${this.formatCurrency(purchase.amount)}</td>
                            <td colspan="4">${purchase.description}</td>
                        `;
                        this.investmentsBody.appendChild(row);
                        
                        totalPurchaseAmount += purchase.amount;
                        if (purchase.shares) totalPurchaseShares += purchase.shares;
                    });
                
                // Purchase subtotal
                const purchaseSubtotal = document.createElement('tr');
                purchaseSubtotal.className = 'subtotal-row';
                purchaseSubtotal.innerHTML = `
                    <td colspan="3" style="padding-left: 20px;"><strong>Total Purchases</strong></td>
                    <td class="amount-cell"><strong>${totalPurchaseShares ? totalPurchaseShares.toLocaleString() : '-'}</strong></td>
                    <td class="amount-cell">-</td>
                    <td class="amount-cell"><strong>${this.formatCurrency(totalPurchaseAmount)}</strong></td>
                    <td colspan="4"></td>
                `;
                this.investmentsBody.appendChild(purchaseSubtotal);
            }
            
            // Sales section
            if (data.sales.length > 0) {
                const saleHeader = document.createElement('tr');
                saleHeader.innerHTML = `
                    <td colspan="10" style="background-color: #f4e8e8; padding: 5px 10px;">
                        <strong>Sales</strong>
                    </td>
                `;
                this.investmentsBody.appendChild(saleHeader);
                
                let totalSaleAmount = 0;
                let totalSaleShares = 0;
                
                data.sales
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .forEach(sale => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td style="padding-left: 20px;">${this.formatDate(sale.date)}</td>
                            <td>${sale.round}</td>
                            <td>${sale.tranche}</td>
                            <td class="amount-cell">
                                ${sale.round && ['SAFE', 'Convertible Note'].includes(sale.round) ? 'N/A' : 
                                  sale.shares ? sale.shares.toLocaleString() : ''}
                            </td>
                            <td class="amount-cell">
                                ${sale.round && ['SAFE', 'Convertible Note'].includes(sale.round) ? 'N/A' : 
                                  sale.pricePerShare ? this.formatCurrency(sale.pricePerShare) : ''}
                            </td>
                            <td class="amount-cell">${this.formatCurrency(sale.amount)}</td>
                            <td colspan="4">${sale.description}</td>
                        `;
                        this.investmentsBody.appendChild(row);
                        
                        totalSaleAmount += sale.amount;
                        if (sale.shares) totalSaleShares += sale.shares;
                    });
                
                // Sale subtotal
                const saleSubtotal = document.createElement('tr');
                saleSubtotal.className = 'subtotal-row';
                saleSubtotal.innerHTML = `
                    <td colspan="3" style="padding-left: 20px;"><strong>Total Sales</strong></td>
                    <td class="amount-cell"><strong>${totalSaleShares ? totalSaleShares.toLocaleString() : '-'}</strong></td>
                    <td class="amount-cell">-</td>
                    <td class="amount-cell"><strong>${this.formatCurrency(totalSaleAmount)}</strong></td>
                    <td colspan="4"></td>
                `;
                this.investmentsBody.appendChild(saleSubtotal);
            }
            
            // Add spacer row between companies
            const spacerRow = document.createElement('tr');
            spacerRow.innerHTML = '<td colspan="10">&nbsp;</td>';
            this.investmentsBody.appendChild(spacerRow);
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

class Notes {
    constructor() {
        this.notes = JSON.parse(localStorage.getItem('notes')) || [];
        this.notesList = document.getElementById('notesList');
        this.newNoteBtn = document.getElementById('newNoteBtn');
        this.editingNoteId = null;
        
        this.initializeEventListeners();
        this.renderNotes();
    }

    initializeEventListeners() {
        this.newNoteBtn.addEventListener('click', () => {
            this.createNoteForm();
        });
    }

    createNoteForm(note = null) {
        const form = document.createElement('div');
        form.className = 'note-form';
        form.innerHTML = `
            <div class="form-group">
                <input type="text" class="note-title" placeholder="Title" value="${note ? note.title : ''}" required>
            </div>
            <div class="form-group">
                <textarea class="note-content" placeholder="Note content" required>${note ? note.content : ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="save-note primary-btn">Save</button>
                <button type="button" class="cancel-note secondary-btn">Cancel</button>
            </div>
        `;

        if (note) {
            const existingNote = document.querySelector(`[data-id="${note.id}"]`);
            existingNote.replaceWith(form);
        } else {
            this.notesList.insertBefore(form, this.notesList.firstChild);
        }

        const saveBtn = form.querySelector('.save-note');
        const cancelBtn = form.querySelector('.cancel-note');
        const titleInput = form.querySelector('.note-title');
        const contentInput = form.querySelector('.note-content');

        saveBtn.addEventListener('click', () => {
            const title = titleInput.value.trim();
            const content = contentInput.value.trim();

            if (!title || !content) {
                alert('Please fill in both title and content');
                return;
            }

            if (note) {
                this.updateNote(note.id, title, content);
            } else {
                this.addNote(title, content);
            }
        });

        cancelBtn.addEventListener('click', () => {
            if (note) {
                this.renderNote(note);
            } else {
                form.remove();
            }
        });

        titleInput.focus();
    }

    addNote(title, content) {
        const note = {
            id: Date.now(),
            title: title,
            content: content,
            date: new Date().toISOString()
        };

        this.notes.unshift(note);
        this.saveToLocalStorage();
        this.renderNotes();
    }

    updateNote(id, title, content) {
        const index = this.notes.findIndex(note => note.id === id);
        if (index !== -1) {
            this.notes[index] = {
                ...this.notes[index],
                title: title,
                content: content,
                lastModified: new Date().toISOString()
            };
            this.saveToLocalStorage();
            this.renderNotes();
        }
    }

    deleteNote(id) {
        if (confirm('Are you sure you want to delete this note?')) {
            this.notes = this.notes.filter(note => note.id !== id);
            this.saveToLocalStorage();
            this.renderNotes();
        }
    }

    renderNote(note) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note';
        noteElement.dataset.id = note.id;
        
        const date = new Date(note.date);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        let lastModified = '';
        if (note.lastModified) {
            const modifiedDate = new Date(note.lastModified);
            lastModified = `<div class="note-modified">Last modified: ${modifiedDate.toLocaleDateString()} ${modifiedDate.toLocaleTimeString()}</div>`;
        }

        noteElement.innerHTML = `
            <div class="note-header">
                <h3>${note.title}</h3>
                <div class="note-actions">
                    <button class="edit-note">Edit</button>
                    <button class="delete-note">Delete</button>
                </div>
            </div>
            <div class="note-content">${note.content.replace(/\n/g, '<br>')}</div>
            <div class="note-footer">
                <div class="note-date">Created: ${formattedDate}</div>
                ${lastModified}
            </div>
        `;

        noteElement.querySelector('.edit-note').addEventListener('click', () => {
            this.createNoteForm(note);
        });

        noteElement.querySelector('.delete-note').addEventListener('click', () => {
            this.deleteNote(note.id);
        });

        return noteElement;
    }

    renderNotes() {
        this.notesList.innerHTML = '';
        this.notes.forEach(note => {
            this.notesList.appendChild(this.renderNote(note));
        });
    }

    saveToLocalStorage() {
        localStorage.setItem('notes', JSON.stringify(this.notes));
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

    loadUnreconciledEntries() {
        const accountId = this.bankAccountSelect.value;
        if (!accountId) return;

        const bankTransactions = JSON.parse(localStorage.getItem('bankTransactions')) || [];
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

        this.renderBankTransactions(unreconciledBankTransactions);
    }

    renderBankTransactions(transactions) {
        this.bankTransactionsBody.innerHTML = '';
        const accounts = JSON.parse(localStorage.getItem('chartOfAccounts')) || [];
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.dataset.id = transaction.id;
            row.innerHTML = `
                <td>${this.formatDate(transaction.date)}</td>
                <td>${transaction.description || ''}</td>
                <td class="amount-cell">${this.formatCurrency(transaction.amount)}</td>
                <td>
                    <div class="reconcile-controls" style="display: flex; gap: 10px; align-items: center;">
                        <div class="reconcile-options" style="display: none;">
                            <div style="margin-bottom: 10px;">
                                <label>
                                    <input type="radio" name="reconcile-type-${transaction.id}" value="new" checked> Create New Entry
                                </label>
                                <label style="margin-left: 10px;">
                                    <input type="radio" name="reconcile-type-${transaction.id}" value="existing"> Match Existing Entry
                                </label>
                                <label style="margin-left: 10px;">
                                    <input type="radio" name="reconcile-type-${transaction.id}" value="multiple"> Split Into Multiple
                                </label>
                            </div>
                            <div class="new-entry-controls">
                                <select class="account-select">
                                    <option value="">Select Account</option>
                                    ${this.generateAccountOptions(accounts)}
                                </select>
                            </div>
                            <div class="existing-entry-controls" style="display: none;">
                                <select class="transaction-select">
                                    <option value="">Select Transaction</option>
                                    ${this.generateTransactionOptions(transaction)}
                                </select>
                            </div>
                            <div class="multiple-entries-controls" style="display: none;">
                                <div class="multiple-entries-list">
                                    <div class="multiple-entry">
                                        <select class="account-select">
                                            <option value="">Select Account</option>
                                            ${this.generateAccountOptions(accounts)}
                                        </select>
                                        <input type="number" class="amount-input" placeholder="Amount" step="0.01">
                                        <input type="text" class="description-input" placeholder="Description">
                                    </div>
                                </div>
                                <button type="button" class="add-entry-btn" style="margin-top: 5px;">Add Entry</button>
                                <div class="remaining-amount" style="margin-top: 5px;">
                                    Remaining: ${this.formatCurrency(Math.abs(transaction.amount))}
                                </div>
                            </div>
                            <button class="confirm-btn" style="margin-top: 10px;">Confirm</button>
                        </div>
                        <button class="reconcile-btn">Reconcile</button>
                        <button class="delete-btn" style="margin-left: 10px;">Delete</button>
                    </div>
                </td>
            `;
            
            // Add click handlers
            const reconcileControls = row.querySelector('.reconcile-controls');
            const reconcileBtn = row.querySelector('.reconcile-btn');
            const reconcileOptions = row.querySelector('.reconcile-options');
            const newEntryControls = row.querySelector('.new-entry-controls');
            const existingEntryControls = row.querySelector('.existing-entry-controls');
            const accountSelect = row.querySelector('.account-select');
            const transactionSelect = row.querySelector('.transaction-select');
            const confirmBtn = row.querySelector('.confirm-btn');
            const deleteBtn = row.querySelector('.delete-btn');
            const radioButtons = row.querySelectorAll('input[type="radio"]');
            
            reconcileBtn.addEventListener('click', () => {
                reconcileOptions.style.display = 'block';
                reconcileBtn.style.display = 'none';
            });

            radioButtons.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.value === 'new') {
                        newEntryControls.style.display = 'block';
                        existingEntryControls.style.display = 'none';
                        row.querySelector('.multiple-entries-controls').style.display = 'none';
                    } else if (radio.value === 'existing') {
                        newEntryControls.style.display = 'none';
                        existingEntryControls.style.display = 'block';
                        row.querySelector('.multiple-entries-controls').style.display = 'none';
                    } else if (radio.value === 'multiple') {
                        newEntryControls.style.display = 'none';
                        existingEntryControls.style.display = 'none';
                        row.querySelector('.multiple-entries-controls').style.display = 'block';
                    }
                });
            });

            // Add entry button handler
            const addEntryBtn = row.querySelector('.add-entry-btn');
            const multipleEntriesList = row.querySelector('.multiple-entries-list');
            addEntryBtn.addEventListener('click', () => {
                const newEntry = document.createElement('div');
                newEntry.className = 'multiple-entry';
                newEntry.innerHTML = `
                    <select class="account-select">
                        <option value="">Select Account</option>
                        ${this.generateAccountOptions(accounts)}
                    </select>
                    <input type="number" class="amount-input" placeholder="Amount" step="0.01">
                    <input type="text" class="description-input" placeholder="Description">
                    <button type="button" class="remove-entry-btn">&times;</button>
                `;
                multipleEntriesList.appendChild(newEntry);

                // Add remove button handler
                newEntry.querySelector('.remove-entry-btn').addEventListener('click', () => {
                    newEntry.remove();
                    this.updateRemainingAmount(row, transaction);
                });

                // Add amount input handler
                newEntry.querySelector('.amount-input').addEventListener('input', () => {
                    this.updateRemainingAmount(row, transaction);
                });
            });
            
            confirmBtn.addEventListener('click', () => {
                const selectedType = row.querySelector('input[name="reconcile-type-' + transaction.id + '"]:checked').value;
                
                if (selectedType === 'new') {
                    if (!accountSelect.value) {
                        alert('Please select an account');
                        return;
                    }
                    this.reconcileTransaction(transaction, accountSelect.value);
                } else if (selectedType === 'existing') {
                    if (!transactionSelect.value) {
                        alert('Please select a transaction');
                        return;
                    }
                    this.reconcileWithExisting(transaction, transactionSelect.value);
                } else if (selectedType === 'multiple') {
                    // Validate multiple entries
                    const entries = row.querySelectorAll('.multiple-entry');
                    let totalAmount = 0;
                    let hasError = false;

                    entries.forEach(entry => {
                        const accountId = entry.querySelector('.account-select').value;
                        const amount = parseFloat(entry.querySelector('.amount-input').value) || 0;

                        if (!accountId) {
                            alert('Please select an account for all entries');
                            hasError = true;
                            return;
                        }
                        if (amount <= 0) {
                            alert('Please enter a valid amount for all entries');
                            hasError = true;
                            return;
                        }
                        totalAmount += amount;
                    });

                    if (hasError) return;

                    // Validate total amount matches bank transaction
                    if (Math.abs(Math.abs(totalAmount) - Math.abs(transaction.amount)) > 0.01) {
                        alert('Total amount must equal bank transaction amount');
                        return;
                    }

                    this.reconcileTransaction(transaction, null);
                }
            });

            deleteBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this bank transaction?')) {
                    this.deleteBankTransaction(transaction.id);
                }
            });
            
            this.bankTransactionsBody.appendChild(row);
        });
    }

    generateTransactionOptions(bankTransaction) {
        const journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
        
        // Get unreconciled transactions that match the bank date
        const bankDate = new Date(bankTransaction.date + 'T00:00:00');
        const unreconciledTransactions = journalEntries.filter(entry => {
            // Skip reconciled bank transactions
            if (entry.transactionType === 'bank' && entry.reconciled) {
                return false;
            }
            
            // Match date
            const entryDate = new Date(entry.date + 'T00:00:00');
            return entryDate.getTime() === bankDate.getTime() && !entry.reconciled;
        });

        let options = '';
        unreconciledTransactions.forEach(entry => {
            options += `
                <option value="${entry.id}">
                    ${this.formatDate(entry.date)} - ${entry.description || 'No description'} 
                    (${this.formatCurrency(Math.abs(bankTransaction.amount))})
                </option>`;
        });
        return options;
    }

    reconcileWithExisting(bankTransaction, journalEntryId) {
        const journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
        const existingEntry = journalEntries.find(entry => entry.id.toString() === journalEntryId);
        
        if (!existingEntry) {
            alert('Selected transaction not found');
            return;
        }

        // Update the existing entry with bank account details and mark as reconciled
        existingEntry.reconciled = true;
        
        // Add bank account line item to the existing entry
        existingEntry.lineItems.push({
            accountId: this.bankAccountSelect.value,
            accountName: this.getAccountName(this.bankAccountSelect.value),
            accountType: 'Bank Account',
            description: bankTransaction.description || existingEntry.description,
            type: bankTransaction.amount > 0 ? 'debit' : 'credit',
            amount: Math.abs(bankTransaction.amount)
        });

        // Update journal entries
        const updatedEntries = journalEntries.map(entry => 
            entry.id === existingEntry.id ? existingEntry : entry
        );
        localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));

        // Mark as reconciled
        this.reconcileEntry(bankTransaction.id);
        
        // Refresh the view
        this.loadUnreconciledEntries();
    }

    reconcileTransaction(transaction, selectedAccountId, description = null) {
        const journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
        const selectedType = document.querySelector(`input[name="reconcile-type-${transaction.id}"]:checked`).value;

        if (selectedType === 'multiple') {
            const multipleEntriesList = document.querySelector(`tr[data-id="${transaction.id}"] .multiple-entries-list`);
            const entries = multipleEntriesList.querySelectorAll('.multiple-entry');
            let totalAmount = 0;

            const lineItems = Array.from(entries).map(entry => {
                const accountId = entry.querySelector('.account-select').value;
                const amount = parseFloat(entry.querySelector('.amount-input').value) || 0;
                const description = entry.querySelector('.description-input').value;
                totalAmount += amount;

                return {
                    accountId: accountId,
                    accountName: this.getAccountName(accountId),
                    accountType: this.getAccountType(accountId),
                    description: description,
                    type: transaction.amount > 0 ? 'credit' : 'debit',
                    amount: amount
                };
            });

            // Validate total amount matches bank transaction
            if (Math.abs(Math.abs(totalAmount) - Math.abs(transaction.amount)) > 0.01) {
                alert('Total amount must equal bank transaction amount');
                return;
            }

            // Add bank account line item
            lineItems.unshift({
                accountId: this.bankAccountSelect.value,
                accountName: this.getAccountName(this.bankAccountSelect.value),
                accountType: 'Bank Account',
                description: transaction.description,
                type: transaction.amount > 0 ? 'debit' : 'credit',
                amount: Math.abs(transaction.amount)
            });

            const newEntry = {
                date: transaction.date,
                description: transaction.description,
                lineItems: lineItems,
                id: transaction.id,
                transactionType: 'bank',
                reconciled: true
            };

            journalEntries.push(newEntry);
        } else {
            // Original single entry logic
            const newEntry = {
                date: transaction.date,
                description: description || transaction.description,
                lineItems: [
                    {
                        accountId: this.bankAccountSelect.value,
                        accountName: this.getAccountName(this.bankAccountSelect.value),
                        accountType: 'Bank Account',
                        description: description || transaction.description,
                        type: transaction.amount > 0 ? 'debit' : 'credit',
                        amount: Math.abs(transaction.amount)
                    },
                    {
                        accountId: selectedAccountId,
                        accountName: this.getAccountName(selectedAccountId),
                        accountType: this.getAccountType(selectedAccountId),
                        description: description || transaction.description,
                        type: transaction.amount > 0 ? 'credit' : 'debit',
                        amount: Math.abs(transaction.amount)
                    }
                ],
                id: transaction.id,
                transactionType: 'bank',
                reconciled: true
            };
            journalEntries.push(newEntry);
        }

        localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
        this.reconcileEntry(transaction.id);
        this.loadUnreconciledEntries();
    }

    updateRemainingAmount(row, transaction) {
        const entries = row.querySelectorAll('.multiple-entry');
        let totalAmount = 0;
        
        entries.forEach(entry => {
            const amount = parseFloat(entry.querySelector('.amount-input').value) || 0;
            totalAmount += amount;
        });

        const remainingAmount = Math.abs(transaction.amount) - totalAmount;
        const remainingDiv = row.querySelector('.remaining-amount');
        remainingDiv.textContent = `Remaining: ${this.formatCurrency(remainingAmount)}`;
        remainingDiv.style.color = remainingAmount < 0 ? 'red' : 'inherit';
    }

    isReconciled(id) {
        const reconciledEntries = JSON.parse(localStorage.getItem('reconciledEntries')) || {};
        return !!reconciledEntries[id];
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

    deleteBankTransaction(id) {
        const bankTransactions = JSON.parse(localStorage.getItem('bankTransactions')) || [];
        const updatedTransactions = bankTransactions.filter(t => t.id !== id);
        localStorage.setItem('bankTransactions', JSON.stringify(updatedTransactions));
        this.loadUnreconciledEntries();
    }

    reconcileEntry(entryId) {
        const reconciledEntries = JSON.parse(localStorage.getItem('reconciledEntries')) || {};
        const journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
        
        // Mark bank transaction as reconciled
        reconciledEntries[entryId] = {
            date: new Date().toISOString(),
            bankAccountId: this.bankAccountSelect.value
        };
        localStorage.setItem('reconciledEntries', JSON.stringify(reconciledEntries));

        // Mark corresponding journal entry as reconciled
        const journalEntry = journalEntries.find(entry => entry.id === entryId);
        if (journalEntry) {
            journalEntry.reconciled = true;
            localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
        }

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
    new Notes();
    initializeTabs();
    new Reconciliation();
});
