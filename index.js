function getData() {
    return {
        salary: 30000,
        salary_increase: 5,
        pensionPercent: 0, 
        pensionValue: 0, 
        years: 10,
        age: 0, 
        studentLoanType: "None", 
        studentLoanValue: 0, 
        pots: Array(), 

        loadData() {
            const savedSalary = localStorage.getItem('salary');
            if (savedSalary) {
              this.salary = Number(savedSalary);
            }
        },
        saveData() {
            localStorage.setItem('salary', this.salary);
        }, 
        addCustomPot() {
            this.pots.push({
                name: "Savings", 
                value: 1000, 
                interest: 4, 
                isTax: false,                 
                contributionValue: 100, 
                contributionInterval: "Monthly", 
                contributionBrackets: Array(), 
                contributionExternalValue: 0, 
                contributionExternalInterval: "Monthly",                 
                type: "Asset", 
                readonly: false, 
                hide: false, 
            }); 

            const newItem = $('.accordion-item').last();
            new Foundation.Accordion(newItem);
        }, 
        deletePot(pot) {
            this.pots.splice(this.pots.indexOf(pot), 1);
        }, 
        deleteInterval(pot, index) {
            pot.contributionBrackets.splice(index, 1); 
        }, 
        fixedPots() {
            let pots = []; 

            if (this.pensionPercent > 0) {
                pots.push(
                    {
                        name: "Pension", 
                        isTax: true, 
                        contributionBrackets: [
                            {
                                threshold: 0, 
                                percentage: this.pensionPercent, 
                            }
                        ], 
                        value: this.pensionValue, 
                        interest: 4, 
                        type: "Asset", 
                        readonly: true, 
                        // TODO: employer pension
                    }
                )
            }

            pots.push(
                {
                    name: "Income Tax", 
                    isTax: true, 
                    postPension: true, 
                    contributionBrackets: [
                        {
                            threshold: 12570, 
                            percentage: 20, 
                        }, 
                        {
                            threshold: 50270, 
                            percentage: 40, 
                        }, 
                        {
                            threshold: 125140, 
                            percentage: 45, 
                        }
                    ], 
                    type: "Cost", 
                    readonly: true, 
                    hide: true, 
                }, 
                {
                    name: "National Insurance", 
                    isTax: true, 
                    contributionBrackets: [
                        {
                            threshold: 12570, 
                            percentage: 8, 
                        }, 
                        {
                            threshold: 50270, 
                            percentage: 2, 
                        }
                    ], 
                    type: "Cost", 
                    readonly: true, 
                    hide: true, 
                }
            )

            switch (this.studentLoanType) {
                case "Plan2":
                    pots.push(
                        {
                            name: "Student Loan", 
                            isTax: true, 
                            contributionBrackets: [
                                {
                                    threshold: 27295, 
                                    percentage: 9, 
                                }
                            ], 
                            value: this.studentLoanValue, 
                            interest: 6, 
                            type: "Debt", 
                            readonly: true, 
                        }
                    )
            }

            return pots; 
        }, 
        getAllPots() {
            return [...this.fixedPots(), ...this.pots];;
        }, 
        addContributionInterval(pot) {
            pot.contributionBrackets.push({
                threshold: 10000, 
                percentage: 20, 
            });
        }, 
        project() {
            let rows = []; 
            let salary = this.salary; 
            let pots = deepCopy(this.getAllPots()); 

            for (let year = 0; year <= this.years; year++) {
                // create table pots 
                rows.push({
                    year: year, 
                    salary: salary, 
                    takeHome: this.calculateTakehome(salary, pots), 
                    disposable: this.calculateDisposable(salary, pots), 
                    pots: pots.map(pot => {
                        let contribution = this.getContribution(salary, pot); 

                        return {
                            name: pot.name, 
                            type: pot.type, 
                            contribution: contribution, 
                            value: pot.value, 
                            hide: pot.hide, 
                        }
                    }), 
                })
            
                
                // calculate the next values 
                pots.forEach(pot => {    
                    //compute interest 
                    switch (pot.type) {
                    case 'Debt':
                    case 'Asset':
                        pot.value  += pot.value * (pot.interest / 100);
                        break;  
                    }   
                    
                    // compute contributions
                    let contribution = this.getContribution(salary, pot); 
                    switch (pot.type) {
                    case 'Debt':
                        pot.value -= contribution; 
                        break; 
                    case 'Asset':
                        pot.value += contribution; 
                        break; 
                    }

                    if (pot.contributionExternalValue > 0) {
                        let contribution = this.getExternalContribution(salary, pot); 
                        switch (pot.type) {
                        case 'Debt':
                            pot.value -= contribution; 
                            break; 
                        case 'Asset':
                            pot.value += contribution; 
                            break; 
                        }
                    }
                })
                salary += salary * (this.salary_increase / 100);

                this.saveData(); 
            }

            return rows; 
        }, 
        printMoney(text) {
            let format = { 
                style: 'currency', 
                currency: 'GBP', 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 0
            }
            return text.toLocaleString('en-GB', format)
        }, 
        getContribution(salary, pot) {
            if (pot.isTax) {
                pot.contributionBrackets.sort((a, b) => b.threshold - a.threshold)

                if (pot.postPension) {
                    salary -= salary * (this.pensionPercent / 100)
                }
                
                let total = 0; 

                pot.contributionBrackets.forEach(bracket => {
                    total += Math.max(salary - bracket.threshold, 0) * (bracket.percentage /100);
                    salary = Math.min(bracket.threshold, salary); 
                })

                switch (pot.type) {
                case 'Debt':
                    return Math.min(total, pot.value);
                default:
                    return total; 
                }
            } 

            let multiplier = 1; 
            switch (pot.contributionInterval) {
                case "Monthly":
                    multiplier = 12;
                    break; 
            }

            switch (pot.type) {
            case 'Debt':
                return Math.min(pot.contributionValue * multiplier, pot.value); 
            default:
                return pot.contributionValue * multiplier; 
            } 
        }, 
        getExternalContribution(salary, pot) {
            let personalContribution = this.getContribution(salary, pot); 

            let multiplier = 1; 
            switch (pot.contributionExternalInterval) {
                case "Monthly":
                    multiplier = 12;
                    break; 
            }

            switch (pot.type) {
            case 'Debt':
                return Math.min(pot.contributionExternalValue * multiplier, pot.value - personalContribution); 
            default:
                return pot.contributionExternalValue * multiplier; 
            } 
        }, 
        calculateTakehome(salary, pots) {
            let takeHome = salary; 
            pots.forEach(pot => {
                if (pot.isTax) {
                    takeHome -= this.getContribution(salary, pot); 
                }
            })
            return takeHome
        }, 
        calculateDisposable(salary, pots) {
            let takeHome = salary; 
            pots.forEach(pot => {
                takeHome -= this.getContribution(salary, pot); 
            })
            return takeHome
        }
    }
}

function deepCopy(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepCopy(item));
    }

    const result = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            result[key] = deepCopy(obj[key]);
        }
    }
    return result;
}

// Use a Mutation Observer to watch for changes in the accordion list
const accordionList = document.querySelector('.accordion');
const observer = new MutationObserver(() => {
    Foundation.reInit($('.accordion'));
});

// Configure the observer to watch for child list mutations (like added nodes)
observer.observe(accordionList, { childList: true });
