const calendarElement = document.getElementById('calendar');
const monthDisplay = document.getElementById('monthDisplay');
let currentDate = new Date();
let selectedVisitor = null;
let selectedDayElement = null;

// Function to load visits from localStorage
function loadVisits() {
    const visitsData = localStorage.getItem('visits');
    return visitsData ? JSON.parse(visitsData) : {};
}

// Function to save visits to localStorage
function saveVisits(visits) {
    localStorage.setItem('visits', JSON.stringify(visits));
}

// Load initial visits from localStorage
const visits = loadVisits();

// Function to update the dropdown with recorded visitors
function updateVisitorDropdown() {
    const visitorSelect = document.getElementById('visitorSelect');
    visitorSelect.innerHTML = '<option value="" disabled selected>Select a visitor</option>'; // Reset dropdown

    const recordedVisitors = new Set(Object.keys(visits));

    recordedVisitors.forEach(visitor => {
        const option = document.createElement('option');
        option.value = visitor;
        option.innerText = visitor;
        visitorSelect.appendChild(option);
    });

    // Add the "..." option for adding a new visitor
    const newOption = document.createElement('option');
    newOption.value = 'new';
    newOption.innerText = '...';
    visitorSelect.appendChild(newOption);
}

function renderCalendar() {
    calendarElement.innerHTML = '';
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const options = { month: 'long', year: 'numeric' };
    monthDisplay.innerText = firstDay.toLocaleDateString('en-US', options);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'col text-center font-weight-bold';
        dayElement.innerText = day;
        calendarElement.appendChild(dayElement);
    });

    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyDay = document.createElement('div');
        calendarElement.appendChild(emptyDay);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const fullDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayElement = document.createElement('div');
        dayElement.className = 'col text-center p-3 border border-light bg-light position-relative';
        dayElement.innerText = day;
        dayElement.dataset.fullDate = fullDate;

        // Display visit tags
        for (const visitor in visits) {
            if (visits[visitor].dates && visits[visitor].dates[fullDate]) {
                const tag = document.createElement("span");
                tag.className = "badge mr-1";
                tag.innerText = `${visitor} (Visit ${visits[visitor].dates[fullDate]})`;
                tag.style.backgroundColor = visits[visitor].color;

                // Add right-click event
                tag.addEventListener("contextmenu", function (e) {
                    e.preventDefault(); // Prevent the default context menu
                    showContextMenu(e.pageX, e.pageY); // Show custom context menu
                    selectedVisitor = visitor; // Store the selected visitor name
                    selectedDayElement = dayElement; // Store the reference to the current dayElement
                });

                // Add long-press event for mobile
                let longPressTimer;
                tag.addEventListener("touchstart", function (e) {
                    longPressTimer = setTimeout(() => {
                        showContextMenu(e.touches[0].pageX, e.touches[0].pageY);
                        selectedVisitor = visitor; // Store selected visitor name
                        selectedDayElement = dayElement; // Store the reference to the current dayElement
                    }, 500); // 500ms for long press
                });

                tag.addEventListener("touchend", function () {
                    clearTimeout(longPressTimer); // Clear the timer if the touch ends
                });

                dayElement.appendChild(tag);
            }
        }

        const addButton = document.createElement('button');
        addButton.className = 'btn btn-success btn-sm position-absolute';
        addButton.innerText = '+';
        addButton.style.top = '5px';
        addButton.style.right = '5px';

        // Add click event to the "+" button to open modal
        addButton.onclick = () => {
            const newVisitorNameInput = document.getElementById('newVisitorName');
            newVisitorNameInput.value = "";
            newVisitorContainer.style.maxHeight = '0'; // Slide up
            newVisitorContainer.style.opacity = '0'; // Fade out
            updateVisitorDropdown(); // Update dropdown

            // Set the visit number based on existing visits
            const visitorNames = Object.keys(visits);
            if (visitorNames.length) {
                const maxVisitNumbers = visitorNames.map(name => visits[name].count);
                const maxVisitNumber = Math.max(...maxVisitNumbers);
                document.getElementById('visitNumberDisplay').value = maxVisitNumber + 1; // Set to next total visit number
            } else {
                document.getElementById('visitNumberDisplay').value = 1; // Set to 1 if no visits
            }

            document.getElementById('visitDate').value = fullDate;
            $('#mainModal').modal('show');
        };

        dayElement.appendChild(addButton);
        calendarElement.appendChild(dayElement);
    }
}

// Button event listeners
document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// Save visit button in modal
document.getElementById('saveVisit').addEventListener('click', () => {
    const visitNumberInput = document.getElementById('visitNumberDisplay');
    let visitorName = document.getElementById('visitorSelect').value; // Ensure we're referencing the right element
    const newVisitorNameInput = document.getElementById('newVisitorName'); // Correct reference
    const newVisitorName = newVisitorNameInput.value.trim();
    const visitorColor = document.getElementById('visitorColor').value; // Get color input
    const visitDate = document.getElementById('visitDate').value;

    // Check if user chose to add a new visitor
    if (visitorName === 'new' && newVisitorName) {
        visitorName = newVisitorName;
        visits[visitorName] = { count: 1, dates: {}, color: visitorColor }; // Save color
        document.getElementById('visitorSelect').value = ''; // Reset dropdown after adding
    } else if (visitorName) {
        // Update the color if the visitor already exists
        visits[visitorName].color = visitorColor; // Update color
        visits[visitorName].count = visitNumberInput.value; // Increment the total visit count
    }

    // Store the visit date
    if (visitorName) {
        if (!visits[visitorName].dates[visitDate]) {
            visits[visitorName].dates[visitDate] = visits[visitorName].count; // Store the visit date and current count
        } else {
            console.warn(`Visit for ${visitorName} on ${visitDate} already exists.`);
        }

        saveVisits(visits); // Save updated visits to localStorage
        console.log('Visits saved:', visits); // Log visits for debugging
        renderCalendar(); // Re-render the calendar to show new visit
        $('#addVisitModal').modal('hide'); // Hide modal
    } else {
        console.warn('Visitor name is empty.');
    }
});

// Dropdown change event for visitors
document.getElementById('visitorSelect').addEventListener('change', function () {
    const visitorName = this.value;
    const visitNumberInput = document.getElementById('visitNumberInput');
    const newVisitorContainer = document.getElementById('newVisitorContainer');
    const newVisitorNameInput = document.getElementById('newVisitorName');

    if (visitorName === 'new') {
        // Show the new visitor input with sliding effect
        newVisitorContainer.style.display = 'block'; // Show the container
        setTimeout(() => {
            newVisitorContainer.style.maxHeight = '200px'; // Adjust height as necessary
            newVisitorContainer.style.opacity = '1'; // Fade in
        }, 10); // Small timeout to ensure the display is updated before transition

        newVisitorNameInput.focus();
    } else if (visitorName) {
        // Existing visitor selected: hide new visitor input
        newVisitorContainer.style.maxHeight = '0'; // Slide up
        newVisitorContainer.style.opacity = '0'; // Fade out

        setTimeout(() => {
            newVisitorContainer.style.display = 'none'; // Hide after transition
        }, 500); // Match timeout with transition duration
        updateVisitNumberInput(visitorName);
    }
});


function showContextMenu(x, y) {
    const contextMenu = document.getElementById("contextMenu");
    contextMenu.style.display = "block";
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;

    // Add event listener for delete option
    const deleteVisitItem = document.getElementById("deleteVisitItem");
    deleteVisitItem.onclick = function () {
        // Remove the visit from visits
        if (selectedVisitor && selectedDayElement) {
            const visitDate = selectedDayElement.dataset.fullDate;

            if (visits[selectedVisitor] && visits[selectedVisitor].dates[visitDate]) {
                // Delete the visit date entry
                delete visits[selectedVisitor].dates[visitDate];

                // Check if there are no more visits for the visitor
                if (Object.keys(visits[selectedVisitor].dates).length === 0) {
                    delete visits[selectedVisitor]; // Remove visitor if no visits left
                }

                saveVisits(visits); // Save updated visits to localStorage
                renderCalendar(); // Re-render the calendar to show updated visits
            }
        }
        contextMenu.style.display = "none"; // Hide context menu
    };
}

function updateVisitNumberInput(visitorName) {
    const visitorData = visits[visitorName];

    if (visitorData && visitorData.dates) {
        // Get the highest count from the dates
        const highestCount = Math.max(...Object.values(visitorData.dates));

        // Set the visit number input to the highest count + 1
        visitNumberInput.value = highestCount + 1;
    } else {
        // Handle the case where there are no dates or visitor data
        visitNumberInput.value = 1; // Default to 1 if no previous visits
    }
}
document.addEventListener("click", function (e) {
    if (!document.getElementById("contextMenu").contains(e.target)) {
        document.getElementById("contextMenu").style.display = "none"; // Hide context menu when clicking elsewhere
    }
});


// Initial calendar rendering
renderCalendar();
