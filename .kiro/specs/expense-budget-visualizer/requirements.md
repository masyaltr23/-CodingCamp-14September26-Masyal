# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses by entering transactions, viewing a running balance, and understanding spending patterns through a visual pie chart. All data is persisted in the browser's LocalStorage. The application is built with HTML, CSS, and Vanilla JavaScript only.

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single expense entry consisting of an Item Name, an Amount, and a Category.
- **Item_Name**: A non-empty text label (maximum 100 characters) identifying what was purchased or spent.
- **Amount**: A positive numeric value greater than 0 and at most 999,999,999.99 representing the cost of a transaction.
- **Category**: One of three fixed classifications for a transaction: Food, Transport, or Fun.
- **Transaction_List**: The scrollable on-screen list displaying all stored transactions.
- **Balance_Display**: The UI element at the top of the page that shows the computed total balance.
- **Total_Balance**: The sum of all transaction amounts currently stored; always a non-negative number or zero.
- **Total_Expenses**: The sum of all transaction amounts, used as the basis for pie chart proportions.
- **Pie_Chart**: A circular chart rendered via Chart.js that shows spending distribution across categories.
- **LocalStorage**: The browser's window.localStorage API used for client-side data persistence.
- **Form**: The input form containing the Item Name field, Amount field, Category selector, and Submit button.
- **Validator**: The client-side logic that checks all form fields before a transaction is added.
- **Chart_Renderer**: The component responsible for drawing and updating the Pie_Chart.
- **Storage_Manager**: The component responsible for reading and writing transaction data to LocalStorage.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to enter expense details through a form, so that I can record my spending quickly.

#### Acceptance Criteria

1. THE App SHALL render a Form containing an Item_Name text input, an Amount numeric input, a Category selector with options Food, Transport, and Fun, and a Submit button.
2. WHEN the user submits the Form with all fields filled and a valid Amount greater than 0 and at most 999,999,999.99, THE Validator SHALL accept the input and create a new Transaction.
3. IF the user submits the Form with the Item_Name field empty, THEN THE Validator SHALL prevent submission and display an inline error message indicating the Item_Name is required.
4. IF the user submits the Form with an Item_Name value exceeding 100 characters, THEN THE Validator SHALL prevent submission and display an inline error message indicating the Item_Name must be 100 characters or fewer.
5. IF the user submits the Form with the Amount field empty, THEN THE Validator SHALL prevent submission and display an inline error message indicating the Amount is required.
6. IF the user submits the Form with an Amount value less than or equal to zero, THEN THE Validator SHALL prevent submission and display an inline error message indicating the Amount must be a positive number.
7. IF the user submits the Form with an Amount value greater than 999,999,999.99, THEN THE Validator SHALL prevent submission and display an inline error message indicating the Amount must not exceed 999,999,999.99.
8. IF the user submits the Form with no Category selected, THEN THE Validator SHALL prevent submission and display an inline error message indicating a Category must be chosen.
9. WHEN a Transaction is successfully created, THE Form SHALL clear all input fields and reset to its initial empty state.

---

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to see all my recorded transactions in a list, so that I can review what I have spent.

#### Acceptance Criteria

1. THE App SHALL render a Transaction_List that displays every stored Transaction in the order they were added, from most recent to oldest.
2. THE Transaction_List SHALL display each Transaction's Item_Name (up to 100 characters), Amount (as a numeric value with 2 decimal places and a currency symbol), and Category as visible text.
3. WHILE the number of Transactions exceeds the visible height of the Transaction_List container, THE Transaction_List SHALL remain scrollable so all Transactions are accessible.
4. THE Transaction_List SHALL display each Transaction with a delete control (button or icon) that is visually associated with that Transaction's row.
5. WHEN the user activates the delete control for a Transaction, THE App SHALL remove that Transaction from the Transaction_List and from LocalStorage without requiring a page reload.
6. IF a delete operation fails to update LocalStorage, THEN THE App SHALL retain the Transaction in the Transaction_List and display an error message indicating the deletion could not be completed.
7. WHEN no Transactions exist, THE Transaction_List SHALL display a message indicating no transactions have been added yet.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending balance at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE Balance_Display SHALL be visible at the top of the page at all times.
2. THE Balance_Display SHALL show the Total_Balance formatted with a currency symbol prefix and as a numeric value with two decimal places (e.g., $0.00).
3. WHEN a new Transaction is added, THE Balance_Display SHALL update to reflect the new Total_Balance within 100 milliseconds without requiring a page reload.
4. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the new Total_Balance within 100 milliseconds without requiring a page reload.
5. WHEN no Transactions exist, THE Balance_Display SHALL show a Total_Balance of $0.00.
6. WHEN a Transaction is edited or updated, THE Balance_Display SHALL update to reflect the new Total_Balance within 100 milliseconds without requiring a page reload.
7. IF LocalStorage returns transaction data that is invalid or cannot be parsed, THEN THE Balance_Display SHALL fall back to displaying $0.00 and render a visible error state indicator.

---

### Requirement 4: Visual Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart_Renderer SHALL render a Pie_Chart in which each slice's angle is proportional to that Category's share of Total_Expenses, rounded to two decimal places.
2. THE Pie_Chart SHALL display a distinct color for each Category (Food, Transport, Fun) that is consistent across all renders.
3. THE Pie_Chart SHALL include a legend identifying each Category, its corresponding color, and its percentage share of Total_Expenses rounded to one decimal place.
4. WHEN a new Transaction is added, THE Chart_Renderer SHALL re-render the Pie_Chart to reflect the updated category distribution within 100 milliseconds without requiring a page reload.
5. WHEN a Transaction is deleted, THE Chart_Renderer SHALL re-render the Pie_Chart to reflect the updated category distribution within 100 milliseconds without requiring a page reload.
6. WHEN all Transactions are deleted, THE Chart_Renderer SHALL display a placeholder state containing a message indicating no spending data is available.
7. IF Total_Expenses is zero, THEN THE Chart_Renderer SHALL display the placeholder state described in criterion 6 rather than rendering a pie chart with zero-value slices.
8. IF a Category has no Transactions, THEN THE Chart_Renderer SHALL omit that Category's slice from the Pie_Chart entirely rather than rendering a zero-width slice.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions, so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is created, THE Storage_Manager SHALL serialize the Transaction and write it to LocalStorage before the next user interaction is processed.
2. WHEN a Transaction is deleted, THE Storage_Manager SHALL remove that Transaction's entry from LocalStorage before the next user interaction is processed.
3. WHEN the App is loaded or reloaded, THE Storage_Manager SHALL read all previously stored Transactions from LocalStorage and restore the Transaction_List, Balance_Display, and Pie_Chart to reflect the stored data.
4. IF LocalStorage is unavailable or returns data that cannot be parsed as a valid Transaction array, THEN THE Storage_Manager SHALL initialize the App with an empty Transaction_List and render no error message or notification to the user.
5. IF LocalStorage returns a Transaction array in which one or more individual entries cannot be parsed as a valid Transaction, THEN THE Storage_Manager SHALL restore only the entries that are valid and discard the unparseable entries, resulting in a Transaction_List, Balance_Display, and Pie_Chart that reflect only the valid entries.

---

### Requirement 6: Technology Constraints and File Structure

**User Story:** As a developer, I want the application to use only HTML, CSS, and Vanilla JavaScript, so that it is simple to deploy and requires no build tools.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no front-end frameworks or libraries except Chart.js loaded via CDN.
2. THE App SHALL consist of a single HTML entry-point file, exactly one CSS file inside a css/ directory, and exactly one JavaScript file inside a js/ directory.
3. THE App SHALL function correctly in the latest stable versions of Chrome, Firefox, Edge, and Safari without polyfills or transpilation.
4. WHEN the App is loaded on a standard broadband connection (defined as download speed >= 25 Mbps), THE App SHALL become interactive, with all UI controls responsive to user input, within 3 seconds from the initial page request.
5. IF Chart.js fails to load from the CDN, THEN THE App SHALL display an error message indicating that the charting library could not be loaded and that charts are unavailable, while all non-chart features remain functional.

---

### Requirement 7: Visual Design and Accessibility

**User Story:** As a user, I want a clean and readable interface, so that I can use the app without confusion or visual clutter.

#### Acceptance Criteria

1. THE App SHALL use a clear visual hierarchy with the Balance_Display prominent at the top, followed by the Form, the Transaction_List, and the Pie_Chart, with each section separated by a minimum of 16px vertical spacing.
2. THE App SHALL use a consistent color scheme throughout all UI elements, with body text rendered at a minimum font size of 14px and heading text at a minimum font size of 18px.
3. THE App SHALL render correctly on viewport widths from 320px to 1920px without horizontal scrolling or overlapping elements.
4. THE App SHALL provide a minimum color contrast ratio of 4.5:1 between normal text and its background, and a minimum of 3:1 between large text (18px or bold 14px and above) and its background, for all UI elements.
5. WHEN the user interacts with the Form fields or Submit button, THE App SHALL provide a visible focus indicator with a minimum 2px outline and at least 3:1 contrast ratio between the focus indicator color and the adjacent background color.
6. IF a viewport width change causes any UI section to overflow its container, THEN THE App SHALL reflow the affected section to a single-column layout without truncating or hiding any content.
