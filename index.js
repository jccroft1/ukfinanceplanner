function getData() {
    return {
        data: {
            salary: 30000,
            salaryPercent: 5,
            pensionPercent: 0, 
            pensionValue: 0, 
            pensionEmployer: 0, 
            years: 10,
            age: 0, 
            studentLoanType: "None", 
            studentLoanValue: 0, 
            pots: Array(), 
        }, 
        loadData() {
            const savedData = localStorage.getItem('data');
            if (savedData) {
              this.data = JSON.parse(savedData);
            }
        },
        saveData() {
            localStorage.setItem('data', JSON.stringify(this.data));
        }, 
        addCustomPot() {
            this.data.pots.push({
                name: "Savings", 
                value: 1000, 
                interest: 4, 
                isTax: false,
                personalContribution: {
                    value: 100, 
                    interval: "Monthly", 
                    brackets: Array(), 
                }, 
                externalContribution: {
                    value: 0, 
                    interval: "Monthly",                 
                    brackets: Array(), 
                }, 
                type: "Asset", 
                readonly: false, 
                hide: false, 
            }); 

            const newItem = $('.accordion-item').last();
            new Foundation.Accordion(newItem);
        }, 
        deletePot(pot) {
            this.data.pots.splice(this.data.pots.indexOf(pot), 1);
        }, 
        deletePersonalInterval(pot, index) {
            pot.personalContribution.brackets.splice(index, 1); 
        }, 
        deleteExternalInterval(pot, index) {
            pot.externalContribution.brackets.splice(index, 1); 
        }, 
        fixedPots() {
            let pots = []; 

            if (this.data.pensionPercent > 0) {
                pots.push(
                    {
                        name: "Pension", 
                        isTax: true, 
                        personalContribution: {
                            brackets: [
                                {
                                    threshold: 0, 
                                    percentage: this.data.pensionPercent, 
                                }
                            ]
                        }, 
                        externalContribution: {
                            brackets: [
                                {
                                    threshold: 0, 
                                    percentage: this.data.pensionEmployer, 
                                }
                            ]
                        }, 
                        value: this.data.pensionValue, 
                        interest: 7, 
                        type: "Asset", 
                        readonly: true, 
                    }
                )
            }

            pots.push(
                {
                    name: "Income Tax", 
                    isTax: true, 
                    postPension: true, 
                    personalContribution: {
                        brackets: [
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
                        ]
                    }, 
                    externalContribution: {
                        value: 0, 
                        interval: "Monthly",                 
                        brackets: Array(), 
                    }, 
                    type: "Cost", 
                    readonly: true, 
                    hide: true, 
                }, 
                {
                    name: "National Insurance", 
                    isTax: true, 
                    personalContribution: {
                        brackets:[
                            {
                                threshold: 12570, 
                                percentage: 8, 
                            }, 
                            {
                                threshold: 50270, 
                                percentage: 2, 
                            }
                        ]
                    }, 
                    externalContribution: {
                        value: 0, 
                        interval: "Monthly",                 
                        brackets: Array(), 
                    }, 
                    type: "Cost", 
                    readonly: true, 
                    hide: true, 
                }
            )

            switch (this.data.studentLoanType) {
                case "Plan2":
                    pots.push(
                        {
                            name: "Student Loan", 
                            isTax: true, 
                            personalContribution: {
                                brackets: [
                                    {
                                        threshold: 27295, 
                                        percentage: 9, 
                                    }
                                ]
                            }, 
                            externalContribution: {
                                value: 0, 
                                interval: "Monthly",                 
                                brackets: Array(), 
                            }, 
                            value: this.data.studentLoanValue, 
                            interest: 6, 
                            type: "Debt", 
                            readonly: true, 
                        }
                    )
            }

            return pots; 
        }, 
        getAllPots() {
            return [...this.fixedPots(), ...this.data.pots];;
        }, 
        addPersonalContributionInterval(pot) {
            pot.personalContribution.brackets.push({
                threshold: 10000, 
                percentage: 20, 
            });
        }, 
        project() {
            let rows = []; 
            let salary = this.data.salary; 
            let pots = deepCopy(this.getAllPots()); 

            for (let year = 0; year <= this.data.years; year++) {
                let takeHome = salary; 
                let disposable = salary; 

                // create table pots 
                let potData = pots.map(pot => {
                    let contribution = this.getContribution(salary, pot, false); 
                    
                    disposable -= contribution; 
                    if (pot.isTax) {
                        takeHome -= contribution; 
                    }

                    return {
                        name: pot.name, 
                        type: pot.type, 
                        contribution: contribution, 
                        value: pot.value, 
                        hide: pot.hide, 
                    }
                });

                rows.push({
                    year: year, 
                    salary: salary, 
                    pots: potData, 
                    takeHome: takeHome, 
                    disposable: disposable
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
                    
                    // compute personal contributions
                    let personalContribution = this.getContribution(salary, pot, false); 
                    switch (pot.type) {
                    case 'Debt':
                        pot.value -= personalContribution; 
                        break; 
                    case 'Asset':
                        pot.value += personalContribution; 
                        break; 
                    }

                    // compute external contributions
                    let externalContribution = this.getContribution(salary, pot, true); 
                    switch (pot.type) {
                    case 'Debt':
                        pot.value -= externalContribution; 
                        break; 
                    case 'Asset':
                        pot.value += externalContribution; 
                        break; 
                    }
                })
                salary += salary * (this.data.salaryPercent / 100);
            }
            this.saveData(); 

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
        getContribution(salary, pot, external) {
            let contribution = pot.personalContribution; 
            if (external) {
                contribution = pot.externalContribution; 
            }

            if (pot.isTax) {
                contribution.brackets.sort((a, b) => b.threshold - a.threshold)

                if (pot.postPension) {
                    salary -= salary * (this.data.pensionPercent / 100)
                }
                
                let total = 0; 

                contribution.brackets.forEach(bracket => {
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
            switch (contribution.interval) {
                case "Monthly":
                    multiplier = 12;
                    break; 
            }

            switch (pot.type) {
            case 'Debt':
                return Math.min(contribution.value * multiplier, pot.value); 
            default:
                return contribution.value * multiplier; 
            } 
        }, 
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
