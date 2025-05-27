// main.js

const API_URL = "https://sheetdb.io/api/v1/jw51t81ne4oan";
let trips = [];

function renderTripOptions() {
  const tripSelect = document.getElementById("trip-select");
  if (!tripSelect) return;
  tripSelect.innerHTML = ""; // Clear previous options, like "Loading trips..."
  if (trips.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No trips currently available";
    tripSelect.appendChild(option);
    return;
  }
  trips.forEach((trip, index) => {
    // Basic check for essential trip data to avoid errors
    if (trip.date && trip.time && trip.type) {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${trip.date} ${trip.time} – ${trip.type}`;
        tripSelect.appendChild(option);
    } else {
        console.warn("Skipping trip with missing data:", trip);
    }
  });
}

function renderTripList() {
  const list = document.getElementById("trip-list") || document.getElementById("admin-trip-list");
  if (!list) return;
  list.innerHTML = ""; // Clear previous content, like "Loading..."
  if (trips.length === 0 && list.id === "trip-list") {
    list.innerHTML = '<p class="text-gray-600">No trips currently scheduled. Please check back later!</p>';
    return;
  }
   if (trips.length === 0 && list.id === "admin-trip-list") {
    list.innerHTML = '<p class="text-gray-600">No trip slots have been added yet.</p>';
    return;
  }

  trips.forEach((trip, index) => {
    // Basic check for essential trip data
    if (trip.date && trip.time && trip.type && trip.max) {
        const li = document.createElement("li");
        li.className = "bg-white p-3 rounded shadow flex justify-between items-center";
        li.innerHTML = `<span>${trip.date} ${trip.time} – ${trip.type} (${trip.max} people max)</span>`;
        
        if (list.id === "admin-trip-list") {
          const btn = document.createElement("button");
          btn.textContent = "Delete";
          btn.className = "text-red-600 hover:underline";
          btn.onclick = () => {
            // This current delete is only local and does not persist to the database.
            // A real delete would require an API call to SheetDB with DELETE method.
            if (confirm(`Are you sure you want to remove the trip: ${trip.date} ${trip.time} – ${trip.type}?\nThis action is temporary on this view.`)) {
                trips.splice(index, 1);
                renderTripList(); // Re-render this admin list
                // Note: We might not want to call renderTripOptions() here if it impacts a different page (book.html)
                // unless the admin dashboard and booking page share the 'trips' array in real-time (which they don't by default across page loads)
            }
          };
          li.appendChild(btn);
        }
        list.appendChild(li);
    } else {
        console.warn("Skipping rendering trip with missing data:", trip);
    }
  });
  // Call renderTripOptions only if the trip-select element exists on the current page
  if (document.getElementById("trip-select")) {
      renderTripOptions();
  }
}

async function loadTrips() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) {
        throw new Error(`Failed to fetch trips: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    trips = data;
    renderTripList(); // This will call renderTripOptions if on the right page.
  } catch (err) {
    console.error("Failed to fetch trips:", err);
    const tripList = document.getElementById("trip-list");
    if (tripList) {
        tripList.innerHTML = '<p class="text-red-500">Could not load trips. Please try again later.</p>';
    }
    const adminTripList = document.getElementById("admin-trip-list");
    if (adminTripList) {
        adminTripList.innerHTML = '<p class="text-red-500">Could not load trips for admin view. Please try again later.</p>';
    }
  }
}

const slotForm = document.getElementById("slot-form");
if (slotForm) {
  slotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(slotForm); // Use 'formData' to avoid conflict
    const trip = {
      date: formData.get("date"),
      time: formData.get("time"),
      type: formData.get("type"),
      max: formData.get("max")
    };
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [trip] }) // SheetDB expects an object with a 'data' array
      });
      if (!res.ok) {
          const errorData = await res.json(); // Try to get error details from SheetDB
          throw new Error(`Failed to save trip slot: ${res.status} ${res.statusText} - ${errorData.error}`);
      }
      alert("Trip slot added successfully!");
      slotForm.reset();
      loadTrips(); // Refresh the list of trips
    } catch (err) {
      console.error("Failed to save trip slot:", err);
      alert(`Error saving trip slot: ${err.message}`);
    }
  });
}

const bookingForm = document.getElementById("booking-form");
if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(bookingForm); // Use 'formData' to avoid conflict
    const selectedTripIndex = formData.get("trip");

    if (selectedTripIndex === "" || selectedTripIndex === null || !trips[selectedTripIndex]) {
        alert("Please select a valid trip.");
        return;
    }
    const selectedTrip = trips[selectedTripIndex];
    
    const booking = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      num_people: formData.get("num_people"), // New field
      additional_names: formData.get("additional_names") || "", // New field, default to empty string if null/undefined
      trip_date: selectedTrip.date,
      trip_time: selectedTrip.time,
      trip_type: selectedTrip.type
    };

    try {
      const res = await fetch(API_URL + "?sheet=Bookings", { // Ensure your sheet is named "Bookings"
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [booking] }) // SheetDB expects an object with a 'data' array
      });
      if (!res.ok) {
          const errorData = await res.json(); // Try to get error details from SheetDB
          throw new Error(`Booking failed: ${res.status} ${res.statusText} - ${errorData.error}`);
      }
      alert("Booking received! We'll email you shortly.");
      bookingForm.reset();
      // Reset number of people to 1 and hide additional names again
      const numPeopleInput = document.getElementById('num_people');
      if (numPeopleInput) {
          numPeopleInput.value = '1';
          const event = new Event('input', { bubbles: true }); // Trigger input event to hide additional names
          numPeopleInput.dispatchEvent(event);
      }
    } catch (err) {
      console.error("Failed to save booking:", err);
      alert(`Error making booking: ${err.message}`);
    }
  });
}

document.addEventListener("DOMContentLoaded", loadTrips);