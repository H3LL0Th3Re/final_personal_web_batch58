class Testimonial {
    constructor(image, name, text, rating) {
        this.image = image;
        this.name = name;
        this.text = text;
        this.rating = rating;
    }

    createCard() {
        const card = document.createElement('div');
        card.classList.add('testimonial-card');
        card.setAttribute('data-rating', this.rating);

        const img = document.createElement('img');
        img.src = this.image;
        card.appendChild(img);

        const textElement = document.createElement('p');
        textElement.textContent = `"${this.text}"`;
        card.appendChild(textElement);

        const nameElement = document.createElement('h3');
        nameElement.textContent = `- ${this.name}`;
        card.appendChild(nameElement);

        const ratingElement = document.createElement('div');
        ratingElement.classList.add('rating');
        ratingElement.innerHTML = `${this.rating} ★`;
        card.appendChild(ratingElement);

        return card;
    }
}

let testimonialsData = [];

const testimonialsContainer = document.getElementById('testimonials-container');

// Higher-order function to filter and sort testimonials
function filterAndSortTestimonials(testimonials, filterFn) {
    return testimonials.filter(filterFn).sort((a, b) => b.rating - a.rating);
}

// Callback function to filter by rating
function filterByRating(rating) {
    return rating === 'all' ? () => true : (testimonial) => testimonial.rating == rating;
}

// Function to display testimonials with a delay
function displayTestimonials(filterRating = 'all') {
    testimonialsContainer.innerHTML = '';  // Clear current testimonials

    // Simulate a delay before displaying testimonials
    setTimeout(() => {
        const filteredTestimonials = filterAndSortTestimonials(testimonialsData, filterByRating(filterRating));
        filteredTestimonials.forEach(testimonial => {
            testimonialsContainer.appendChild(testimonial.createCard());
        });
    }, 1000); // 1-second delay (1000 ms)
}

// Function to fetch testimonials from JSON using async/await
async function fetchTestimonials() {
    try {

        // //fetch locally:
        // const response = await fetch('../testing_data.json');

        //fetch from n point:
        const response = await fetch('https://api.npoint.io/fd20686a7df0e0dce773');
        
        // Checking if the request was successful
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Convert JSON data into Testimonial objects and return a resolved promise
        testimonialsData = data.map(item => new Testimonial(item.image, item.name, item.text, item.rating));
        
        // Display testimonials after data is fetched
        displayTestimonials();
    } catch (error) {
        console.error('Error fetching testimonials:', error);
    }
}

// Call to fetch and display testimonials
fetchTestimonials();

// Filter buttons functionality
const filterButtons = document.querySelectorAll('.filter-btn');
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        const rating = button.getAttribute('data-rating');
        displayTestimonials(rating);
    });
});
