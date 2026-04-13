function getData() {
    return {
        data: {},
        compareMode: false,
        loadData() {
            // TODO: Move everything inside data, data becomes settings 
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
                salaryPercent: 3,
                pensionPercent: 0,
                pensionValue: 0,
                pensionEmployer: 0,
                pensionSacrifice: false,
                pensionFromBase: false,
                years: 10,
                age: 0,
                studentLoanType: "None",
                studentLoanValue: 0,
                customPots: Array(),
                customActions: Array(),
            }
            this.compareMode = false;
        },
        byName(a, b) {
            const nameA = a.name.toUpperCase(); // ignore upper and lowercase
            const nameB = b.name.toUpperCase();
            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }

            // names must be equal
            return 0;
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
            this.data.customPots.push({
                name: "Savings",
                value: 1000,
                interest: 4,
                isTax: false,
                personalContribution: {
                    value: 100,
                    interval: "Monthly",
                    brackets: Array(),
                    sacrifice: false,
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

            const newItem = $('.accordion-pot-item').last();
            new Foundation.Accordion(newItem);
        },
        deletePot(pot) {
            this.data.customPots.splice(this.data.customPots.indexOf(pot), 1);
        },
        addCustomAction() {
            let firstFromPot = this.getAllPots().filter(p => p.type == 'Asset');
            let firstToPot = this.getAllPots().filter(p => p.type != 'Cost');
            if (firstFromPot.length == 0 || firstToPot.length == 0) {
                return;
            }

            this.data.customActions.push({
                name: "Example",
                year: 1,
                amount: 100,
                fromPot: firstFromPot[0].name,
                toPot: firstToPot[0].name,
                readonly: false,
            });

            const newItem = $('.accordion-action-item').last();
            new Foundation.Accordion(newItem);
        },
        deleteAction(action) {
            this.data.customActions.splice(this.data.customActions.indexOf(action), 1);
        },
        deleteInterval(brackets, index) {
            brackets.splice(index, 1);
        },
        addInterval(brackets) {
            brackets.push({
                threshold: 10000,
                percentage: 20,
            });
        },
        getActionFromPotList() {
            let pots = this.getAllPots();
            pots = pots.filter(p => p.type == 'Asset');
            pots.push({
                name: "External Source",
                type: "External",
                readonly: false,
                hide: false,
            });

            return pots;
        },
        getActionToPotList() {
            let pots = this.getAllPots();
            pots = pots.filter(p => p.type != 'Cost');
            pots.push({
                name: "Spend",
                type: "Cost",
                readonly: false,
                hide: false,
            });

            return pots;
        },
        fixedActions() {
            let actions = [];

            if (this.data.studentLoanType != "None" && this.data.studentLoanGraduation) {
                let graduationYear = this.data.studentLoanGraduation;
                let currentYear = new Date().getFullYear();
                let actionYear = 0;
                switch (this.data.studentLoanType) {
                    case "Plan1":
                        // assume 3 year course 
                        // assume 25 if we don't have age 
                        if (this.data.age > 0 && (graduationYear - 3) < 2006) {
                            // if they are over 65, then they don't have any student loans 
                            actionYear = 65 - this.data.age;
                        } else {
                            actionYear = 25 - (currentYear - graduationYear);
                        }
                        break;
                    case "Plan4":
                        let yearsToExpiry = 30;
                        if (this.data.age > 0 && (graduationYear - 3) < 2007) {
                            if (65 - this.data.age < yearsToExpiry) {
                                yearsToExpiry = 65 - this.data.age;
                            }
                        } else {
                            actionYear = yearsToExpiry - (currentYear - graduationYear);
                        }
                        break;
                    case "Plan2":
                    case "PostGrad":
                        actionYear = 30 - (currentYear - graduationYear);
                        break;
                    case "Plan5":
                        actionYear = 40 - (currentYear - graduationYear);
                        break;
                }
                actions.push({
                    name: "Student Loan Expiry",
                    year: actionYear,
                    amount: 999999,
                    fromPot: "External Source",
                    toPot: "Student Loan",
                    readonly: true,
                })
            }

            return actions;
        },
        getAllActions() {
            return [...this.fixedActions(), ...this.data.customActions];
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
                if (this.data.pensionSacrifice) {
                    taxRelief = 0;
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
                            sacrifice: this.data.pensionSacrifice,
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
                        ],
                        sacrifice: false,
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
                        sacrifice: false,
                        brackets: [
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

            let plan2Lower = 28_470;
            let plan2Higher = 51_245;
            if (this.data.studentLoanType != "None") {
                let threshold = 0.0;
                switch (this.data.studentLoanType) {
                    case "Plan1":
                        threshold = 26_065;
                        break;
                    case "Plan2":
                        threshold = plan2Lower;
                        break;
                    case "Plan4":
                        threshold = 32_745;
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

                let interest = 3.2;
                switch (this.data.studentLoanType) {
                    case "PostGrad":
                        interest = 6.2;
                        break;
                    case "Plan2":
                        let income = this.data.baseSalary + this.data.bonuses;
                        if (income > plan2Lower) {
                            if (income > plan2Higher) {
                                interest = 6.2
                            } else {
                                interest += 3 * ((income - plan2Lower) / (plan2Higher - plan2Lower))
                            }
                        }
                        break;
                }

                pots.push(
                    {
                        name: "Student Loan",
                        isTax: true,
                        personalContribution: {
                            sacrifice: false,
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
            return [...this.fixedPots(), ...this.data.customPots];;
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
            let actions = deepCopy(this.getAllActions());

            for (let year = 0; year <= this.data.years; year++) {
                let takeHome = salary;
                let disposable = salary;

                actions.forEach(action => {
                    if (action.year != year) {
                        return;
                    }

                    let fromPot;
                    if (action.fromPot == 'External Source') {
                        fromPot = {
                            name: "External Source",
                            type: "External",
                            readonly: false,
                            hide: false,
                            value: Number.MAX_SAFE_INTEGER,
                        }
                    } else {
                        fromPot = pots.find(p => p.name == action.fromPot);
                    }
                    if (!fromPot || fromPot == null) {
                        console.log("cound't find fromPot");
                        return;
                    }

                    let amount = action.amount;
                    if (fromPot.value < amount) {
                        amount = fromPot.value
                    }

                    if (action.toPot == 'Spend') {
                        fromPot.value -= amount;
                        return;
                    }

                    let toPot = pots.find(p => p.name == action.toPot);
                    if (!toPot || toPot == null) {
                        console.log("cound't find toPot");
                        return;
                    }

                    if (toPot.type == 'Debt') {
                        toPot.value -= amount;
                        if (toPot.value < amount) {
                            amount = toPot.value;
                            toPot.value = 0;
                        }
                    } else {
                        toPot.value += amount;
                    }

                    fromPot.value -= amount;
                });

                let sacrificedTotalSalary = salary;
                let sacrificedBaseSalary = baseSalary;

                // create table pots 
                let potRow = pots.sort((p1, p2) => {
                    if (p1.personalContribution.sacrifice == p2.personalContribution.sacrifice) {
                        return 0;
                    }
                    if (p1.personalContribution.sacrifice) {
                        return -1;
                    }
                    return 1;
                }).map(pot => {
                    let contribution;
                    if (pot.personalContribution.sacrifice) {
                        contribution = this.getContribution(salary, baseSalary, pot, false);

                        sacrificedTotalSalary -= contribution;
                        sacrificedBaseSalary -= contribution;
                    } else {
                        contribution = this.getContribution(sacrificedTotalSalary, sacrificedBaseSalary, pot, false);
                    }

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
                }).sort(this.byName);

                total.salary += salary;
                total.disposable += disposable;
                total.takeHome += takeHome;
                let newRow = {
                    year: this.data.age > 0 ? this.data.age + year : year,
                    salary: salary,
                    pots: potRow,
                    takeHome: takeHome,
                    disposable: disposable,
                    change: {
                        salary: 0,
                        takeHome: 0,
                        disposable: 0,
                    }
                };

                if (this.compareMode) {
                    ['salary', 'takeHome', 'disposable'].forEach(key => {
                        newRow.change[key] = newRow[key] - this.originalProjection[year][key];
                    })
                }
                rows.push(newRow)

                // calculate the next values 
                pots.forEach(pot => {
                    //compute interest 
                    switch (pot.type) {
                        case 'Debt':
                        case 'Asset':
                            pot.value += pot.value * (pot.interest / 100);
                            break;
                    }

                    let inputSalary = salary;
                    let inputBaseSalary = baseSalary;
                    if (!pot.personalContribution.sacrifice) {
                        inputSalary = sacrificedTotalSalary;
                        inputBaseSalary = sacrificedBaseSalary;
                    }

                    // compute personal contributions
                    // TODO: Reduce the getContribution duplication with above. 
                    let personalContribution = this.getContribution(inputSalary, inputBaseSalary, pot, false);
                    switch (pot.type) {
                        case 'Debt':
                            pot.value -= personalContribution;
                            break;
                        case 'Asset':
                            pot.value += personalContribution;
                            break;
                    }

                    // compute external contributions
                    let externalContribution = this.getContribution(inputSalary, inputBaseSalary, pot, true);
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
                ['salary', 'takeHome', 'disposable'].forEach(key => {
                    totalRow.change[key] = totalRow[key] - this.originalProjection[this.data.years + 1][key];
                })
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

            return 12_570 - ((salary - 100_000) / 2)
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
                amount = this.printMoney(num / 1_000_000);
            } else if (absNum >= 1_000) {
                multiple = 'k';
                amount = this.printMoney(num / 1_000);
            } else {
                amount = this.printMoney(num);
            }

            return (num > 0 ? '+' : '') + amount + multiple;
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

                    total += Math.max(salary - threshold, 0) * (bracket.percentage / 100);
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
const accordionLists = document.querySelectorAll('.accordion');

accordionLists.forEach((accordionList) => {
    const observer = new MutationObserver(() => {
        Foundation.reInit($(accordionList));
    });

    observer.observe(accordionList, { childList: true });
});