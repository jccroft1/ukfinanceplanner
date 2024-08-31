function getData() {
    return {
        data: {},   
        compareMode: false,  
        loadData() {
            let savedData = localStorage.getItem('data');
            if (savedData) {
              this.data = JSON.parse(savedData);
            } else {
                this.reset();
            }

            savedData = localStorage.getItem('originalData');
            if (savedData != "undefined") {
              this.originalData = JSON.parse(savedData);
            }

            savedData = localStorage.getItem('originalProjection');
            if (savedData != "undefined") {
              this.originalProjection = JSON.parse(savedData);
            }

            savedData = localStorage.getItem('compareMode');
            if (savedData != "undefined") {
              this.compareMode = JSON.parse(savedData);
            }
        },
        saveData() {
            localStorage.setItem('data', JSON.stringify(this.data));
            localStorage.setItem('originalData', JSON.stringify(this.originalData));
            localStorage.setItem('originalProjection', JSON.stringify(this.originalProjection));
            localStorage.setItem('compareMode', JSON.stringify(this.compareMode));
        }, 
        reset() {
            this.data = {
                compareMode: false, 
                baseSalary: 30000,
                bonuses: 0, 
                salaryPercent: 5,
                pensionPercent: 0, 
                pensionValue: 0, 
                pensionEmployer: 0, 
                pensionFromBase: false, 
                years: 10,
                age: 0, 
                studentLoanType: "None", 
                studentLoanValue: 0, 
                pots: Array(),    
            }
            this.compareMode = false;
        }, 
        enterCompare() {
            this.originalData = deepCopy(this.data); 
            this.originalProjection = deepCopy(this.project()); 
            this.compareMode = true;
        }, 
        exitCompare() {
            this.data = deepCopy(this.originalData); 
            this.compareMode = false;
        }, 
        totalSalary() {
            return this.data.baseSalary + this.data.bonuses; 
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
                    fromBase: false, 
                }, 
                externalContribution: {
                    value: 0, 
                    interval: "Monthly",                 
                    brackets: Array(), 
                    fromBase: false, 
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
        addPersonalContributionInterval(pot) {
            pot.personalContribution.brackets.push({
                threshold: 10000, 
                percentage: 20, 
            });
        },
        addExternalContributionInterval(pot) {
            pot.externalContribution.brackets.push({
                threshold: 10000, 
                percentage: 20, 
            });
        }, 
        fixedPots() {
            let pots = []; 

            if (this.data.pensionPercent > 0) {
                let taxRelief = 0; 
                if (this.totalSalary() > 125140) {
                    taxRelief = 0.45; 
                } else if (this.totalSalary() > 50270) {
                    taxRelief = 0.45; 
                } else if (this.totalSalary() > 12570) {
                    taxRelief = 0.2; 
                }

                pots.push(
                    {
                        name: "Pension", 
                        isTax: true, 
                        personalContribution: {
                            brackets: [
                                {
                                    threshold: 0, 
                                    percentage: this.data.pensionPercent * (1 - taxRelief), 
                                }
                            ], 
                            fromBase: this.data.pensionFromBase, 
                        }, 
                        externalContribution: {
                            brackets: [
                                {
                                    threshold: 0, 
                                    percentage: this.data.pensionEmployer * (1 + taxRelief), 
                                }
                            ], 
                            fromBase: this.data.pensionFromBase, 
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
                    // TODO: Add Scotland option 
                    name: "Income Tax", 
                    isTax: true, 
                    postPension: true, 
                    personalContribution: {
                        brackets: [
                            {
                                threshold: 0, 
                                percentage: 20, 
                                addPA: true, 
                            }, 
                            {
                                threshold: 37_700, 
                                percentage: 40, 
                                addPA: true, 
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

            if (this.data.studentLoanType != "None") {
                let threshold = 0.0; 
                switch (this.data.studentLoanType) {
                    case "Plan1":
                        threshold = 24_990;
                        break; 
                    case "Plan2":
                        threshold = 27_295;
                        break; 
                    case "Plan4":
                        threshold = 31_395;
                        break; 
                    case "Plan5":
                        threshold = 25_000;
                        break; 
                    case "PostGrad":
                        threshold = 21_000;
                        break; 
                }

                let percentage = 9; 
                if (this.data.studentLoanType == "PostGrad") {
                    percentage = 6; 
                }

                let interest = 8; 
                switch (this.data.studentLoanType) {
                    case "Plan1":
                    case "Plan4":
                        interest = 6.25; 
                }

                pots.push(
                    {
                        name: "Student Loan", 
                        isTax: true, 
                        personalContribution: {
                            brackets: [
                                {
                                    threshold: threshold, 
                                    percentage: percentage, 
                                }
                            ]
                        }, 
                        externalContribution: {
                            value: 0, 
                            interval: "Monthly",                 
                            brackets: Array(), 
                        }, 
                        value: this.data.studentLoanValue, 
                        interest: interest, 
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
        project() {
            let rows = []; 
            let salary = this.totalSalary(); 
            let baseSalary = this.data.baseSalary; 
            let total = {
                salary: 0, 
                takeHome: 0, 
                disposable: 0, 
            }
            let pots = deepCopy(this.getAllPots()); 

            for (let year = 0; year <= this.data.years; year++) {
                let takeHome = salary; 
                let disposable = salary; 

                // create table pots 
                let potData = pots.map(pot => {
                    let contribution = this.getContribution(salary, baseSalary, pot, false); 
                    
                    disposable -= contribution; 
                    if (pot.isTax) {
                        takeHome -= contribution; 
                    }
                    
                    let newPot = {
                        name: pot.name, 
                        type: pot.type, 
                        contribution: contribution, 
                        value: pot.value, 
                        hide: pot.hide, 
                        change: 0, 
                    }
                    if (this.compareMode && newPot.type != 'Cost') {
                        newPot.change = newPot.value - this.originalProjection[year].pots.find(p => p.name == newPot.name).value;
                    }

                    return newPot
                });

                total.salary += salary; 
                total.disposable += disposable;
                total.takeHome += takeHome;
                let newRow = {
                    year: this.data.age > 0 ? this.data.age + year : year, 
                    salary: salary, 
                    pots: potData, 
                    takeHome: takeHome, 
                    disposable: disposable, 
                    change: {
                        salary: 0, 
                        takeHome: 0, 
                        disposable: 0, 
                    }
                }; 

                if (this.compareMode) {
                    newRow.change.salary = newRow.salary - this.originalProjection[year].salary;
                    newRow.change.takeHome = newRow.takeHome - this.originalProjection[year].takeHome;
                    newRow.change.disposable = newRow.disposable - this.originalProjection[year].disposable;
                }
                rows.push(newRow)
            
                
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
                    let personalContribution = this.getContribution(salary, baseSalary, pot, false); 
                    switch (pot.type) {
                    case 'Debt':
                        pot.value -= personalContribution; 
                        break; 
                    case 'Asset':
                        pot.value += personalContribution; 
                        break; 
                    }

                    // compute external contributions
                    let externalContribution = this.getContribution(salary, baseSalary, pot, true); 
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
                baseSalary += baseSalary * (this.data.salaryPercent / 100);
            }

            let totalRow = {
                year: "Total", 
                salary: total.salary, 
                takeHome: total.takeHome, 
                disposable: total.disposable, 
                change: {
                    salary: 0, 
                    takeHome: 0, 
                    disposable: 0, 
                }
            }
            if (this.compareMode) {
                totalRow.change.salary = totalRow.salary - this.originalProjection[this.data.years+1].salary;
                totalRow.change.takeHome = totalRow.takeHome - this.originalProjection[this.data.years+1].takeHome;
                totalRow.change.disposable = totalRow.disposable - this.originalProjection[this.data.years+1].disposable;
            }

            rows.push(totalRow); 

            this.saveData(); 

            return rows; 
        }, 
        personalAllowance(salary) {
            // TODO: Add blind people option 
            if (salary < 100_000) {
                return 12_570; 
            }
            if (salary > 125_140) {
                return 0; 
            }

            return 12_570 - ((salary-100_000)/2)
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
        printChange(num) {
            let multiple = ''; 
            let amount = ''; 
            const absNum = Math.abs(num); 
            if (absNum >= 1_000_000) {
                multiple = 'm';
                amount = this.printMoney(num/1_000_000); 
            }  else if (absNum >= 1_000) {
                multiple = 'k';
                amount = this.printMoney(num/1_000); 
            } else {
                amount = this.printMoney(num); 
            }

            return (num > 0 ? '+' : '') +  amount + multiple; 
        }, 
        getContribution(totalSalary, baseSalary, pot, external) {
            let contribution = pot.personalContribution; 
            if (external) {
                contribution = pot.externalContribution; 
            }

            if (pot.isTax) {
                let salary = totalSalary; 
                if (contribution.fromBase) {
                    salary = baseSalary;
                }

                contribution.brackets.sort((a, b) => b.threshold - a.threshold)

                if (pot.postPension) {
                    salary -= salary * (this.data.pensionPercent / 100)
                }
                
                let total = 0; 

                contribution.brackets.forEach(bracket => {
                    let threshold = bracket.threshold; 
                    if (bracket.addPA) {
                        threshold += this.personalAllowance(salary); 
                    }

                    total += Math.max(salary - threshold, 0) * (bracket.percentage /100);
                    salary = Math.min(threshold, salary); 
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
