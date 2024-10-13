let map;
let markers = [];
let savedAddresses = JSON.parse(localStorage.getItem('addresses')) || [];
let tripAddresses = [];

loadGoogleMapsAPI('initMap');

function loadGoogleMapsAPI(callback) {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyD5o2xQunhHCZWMHXaV__VqDzo6pN0Nq9g&libraries=places&callback=${callback}`;
    script.async = true; // Load the script asynchronously
    script.defer = true; // Defer execution until the document has been parsed
    document.head.appendChild(script);
}

function initMap() {
    const initialLocation = { lat: 35.6762, lng: 139.6503 }; // Tokyo

    map = new google.maps.Map(document.getElementById('map'), {
        center: initialLocation,
        zoom: 12,
    });

    // Listener for map clicks to add markers and save address
    map.addListener('click', (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        addMarker(event.latLng);
        getAddress(lat, lng);
    });

    // Initialize Autocomplete for the search box
    const input = document.getElementById('search-box');
    const autocomplete = new google.maps.places.Autocomplete(input);
    
    // Listener for place selection from autocomplete
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (place.geometry) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const address = place.formatted_address;

            // Pan the map to the selected place
            map.panTo(place.geometry.location);
            addMarker(place.geometry.location);

            // Save address
            saveAddress(address, lat, lng);
        } else {
            alert('No details available for input: ' + place.name);
        }
    });

    // Display saved addresses
    displaySavedAddresses();
    displayTripAddresses();
}

function addMarker(location) {
    const marker = new google.maps.Marker({
        position: location,
        map: map,
    });
    markers.push(marker);
}

function getAddress(lat, lng) {
    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
            const address = results[0].formatted_address;
            saveAddress(address, lat, lng);
        } else {
            alert('No results found');
        }
    });
}

function saveAddress(address, lat, lng) {
    savedAddresses.push({ address, lat, lng });
    localStorage.setItem('addresses', JSON.stringify(savedAddresses));
    displaySavedAddresses();
}

function displaySavedAddresses() {
    const addressList = document.getElementById('saved-addresses');
    addressList.innerHTML = '';

    savedAddresses.forEach((addr, index) => {
        const li = document.createElement('li');

        const addressSpan = document.createElement('span');
        addressSpan.textContent = addr.address;
        addressSpan.style.display = 'block'; 

        const descriptionSpan = document.createElement('span');
        descriptionSpan.textContent = addr.description || 'No description';
        descriptionSpan.setAttribute('contenteditable', 'true'); 
        descriptionSpan.style.display = 'block'; 
        descriptionSpan.style.fontStyle = 'italic'; 
        descriptionSpan.style.color = 'gray'; 
        descriptionSpan.style.marginTop = '5px'; 
        descriptionSpan.style.border = '1px dashed transparent'; 
        descriptionSpan.style.padding = '2px'; 
        descriptionSpan.classList.add('description');

        descriptionSpan.onclick = (e) => {
            e.stopPropagation(); 
            selectText(descriptionSpan); 
        };

        descriptionSpan.onblur = () => {
            if (descriptionSpan.textContent !== addr.description) {
                addr.description = descriptionSpan.textContent; 
                localStorage.setItem('addresses', JSON.stringify(savedAddresses)); 
            }
        };

        const deleteButton = document.createElement('delete-button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'Delete';

        deleteButton.onclick = (e) => {
            e.stopPropagation(); 
            deleteAddress(index);
        };

        li.appendChild(addressSpan);
        li.appendChild(descriptionSpan);
        li.appendChild(deleteButton);
        li.onclick = () => addToTrip(addr.address, addr.lat, addr.lng, addr.description); // Pass description
        addressList.appendChild(li);
    });
}




function deleteAddress(index) {
    // Remove the address at the given index
    savedAddresses.splice(index, 1);

    // Update localStorage with the modified array
    localStorage.setItem('addresses', JSON.stringify(savedAddresses));

    // Refresh the display of saved addresses
    displaySavedAddresses();
}

function addToTrip(address, lat, lng, description) {
    tripAddresses.push({ address, lat, lng, description });
    displayTripAddresses();
    calculateTotalDistance();
}

function displayTripAddresses() {
    const tripList = document.getElementById('trip-list');
    tripList.innerHTML = '';

    tripAddresses.forEach((addr, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${addr.address}`; // Show address

        // Create a span for the description
        const descriptionSpan = document.createElement('span');
        descriptionSpan.textContent = ` - ${addr.description || 'No description'}`; // Show description
        descriptionSpan.style.fontStyle = 'italic'; // Italicize description
        descriptionSpan.style.color = 'gray'; // Change color for better visibility
        descriptionSpan.style.marginLeft = '5px'; // Add some space before the description

        // Append the description to the list item
        li.appendChild(descriptionSpan);
        tripList.appendChild(li);
    });
}

function calculateTotalDistance() {
    if (tripAddresses.length < 2) return; // Need at least 2 addresses

    const service = new google.maps.DistanceMatrixService();

    // Origins are all the points in the trip except the last one
    const origins = tripAddresses.slice(0, tripAddresses.length - 1).map(addr => new google.maps.LatLng(addr.lat, addr.lng));
    
    // Destinations are all the points in the trip except the first one
    const destinations = tripAddresses.slice(1).map(addr => new google.maps.LatLng(addr.lat, addr.lng));

    service.getDistanceMatrix(
        {
            origins: origins,
            destinations: destinations,
            travelMode: google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
            if (status === 'OK') {
                let totalDistance = 0;
                const results = response.rows;

                results.forEach((row, index) => {
                    const element = row.elements[index];
                    if (element.status === 'OK') {
                        totalDistance += element.distance.value; // Distance in meters
                    }
                });

                const totalDistanceKm = (totalDistance / 1000).toFixed(2); // Convert to kilometers
                const totalDistanceMiles = (totalDistance * 0.000621371).toFixed(2); // Convert to miles

                document.getElementById('total-distance').textContent = `Total Distance: ${totalDistanceKm} km (${totalDistanceMiles} miles)`; // Display both distances
            } else {
                alert('Error calculating distances: ' + status);
            }
        }
    );
}

function clearAddresses() {
    localStorage.removeItem('addresses');
    savedAddresses = [];
    displaySavedAddresses();
}

function clearTrip() {
    tripAddresses = [];
    displayTripAddresses();
    document.getElementById('total-distance').textContent = 'Total Distance: 0.00 km (0.00 miles)';
}

function selectText(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges(); // Clear any current selection
    selection.addRange(range); // Add the new range
}
