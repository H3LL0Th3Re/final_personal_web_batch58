// Function to load projects from the database
async function loadProjects() {
    try {
        const response = await fetch('/projects'); // Endpoint to get projects
        const projects = await response.json();

        // Clear existing projects to prevent duplicates
        const projectsContainer = document.getElementById('projectsContainer');
        if (projectsContainer) {
            projectsContainer.innerHTML = ''; // Clear existing projects
        }

        projects.forEach(project => {
            // Ensure technologies is an array, parsing if needed
            let technologiesArray;
            try {
                technologiesArray = Array.isArray(project.technologies) ? project.technologies : JSON.parse(project.technologies || '[]');
            } catch (e) {
                console.error("Error parsing technologies:", e);
                technologiesArray = []; // Default to an empty array on error
            }

            addProjectToDOM(
                project.title,
                project.start_date,
                project.end_date,
                project.description,
                technologiesArray, // Use the parsed technologies array
                project.image_url,
                project.id, // Pass project ID for use later
                project.author
            );
        });
    } catch (error) {
        console.error("Error loading projects:", error);
    }
}

// Function to add a project card to the DOM
function addProjectToDOM(name, start, end, desc, techs, imgSrc, id, author) {
    const projectsContainer = document.getElementById('projectsContainer');
    if (!projectsContainer) return;

    const duration = calculateDuration(start, end);
    const projectCard = document.createElement('div');
    projectCard.classList.add('project-card');
    projectCard.dataset.id = id; // Set the project ID

    // Ensure techs is an array before using map
    const techString = Array.isArray(techs) 
        ? techs.map(tech => `<span class="tech">${tech}</span>`).join(' | ') 
        : `<span class="tech">No technologies available</span>`; // Fallback if not an array

    projectCard.innerHTML = `
        <img src="${imgSrc}" alt="${name}">
        <h3 class="card-title">
            <a a href="/blog-detail/${id}" class="text-decoration-none text-dark">
                ${name} - ${new Date(start).getFullYear()}
            </a>
        </h3>
        <p class="project-author"><strong>Author:</strong> ${author}</p>
        <p class="project-duration">Duration: ${duration}</p>
        <p class="project-description">${desc}</p>
        <p class="project-techs"><strong>Technologies Used:</strong> ${techString}</p>
        <div class="actions">
            <button class="btn btn-warning btn-sm edit">Edit</button>
            <button class="btn btn-danger btn-sm delete">Delete</button>
        </div>
    `;

    projectsContainer.appendChild(projectCard);

    projectCard.querySelector('.delete').addEventListener('click', async () => {
        const projectId = projectCard.dataset.id;
        await deleteProjectFromDB(projectId);
        projectsContainer.removeChild(projectCard);
    });

    projectCard.querySelector('.edit').addEventListener('click', () => {
        // Redirect to the edit page with the project ID
        window.location.href = `/edit-project/${id}`;
    });
}

// Calculate project duration in months and days
function calculateDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const duration = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
    const months = Math.floor(duration / 30);
    const days = duration % 30;
    return `${months} month(s) and ${days} day(s)`;
}

// Add project to the database
async function addProjectToDB(name, description, startDate, endDate, technologies, imageUrl) {
    try {
        const response = await fetch('/add-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                title: name, 
                description, 
                startDate, 
                endDate, 
                technologies: JSON.stringify(technologies), // Ensure technologies is a JSON string
                imageUrl 
            })
        });

        const result = await response.json();
        if (result.id) {
            addProjectToDOM(name, startDate, endDate, description, technologies, imageUrl, result.id);
        } else {
            console.error("Failed to add project:", result); // Log error if the project wasn't added
        }
    } catch (error) {
        console.error("Error adding project:", error);
    }
}

// Delete project from the database
async function deleteProjectFromDB(id) {
    try {
        await fetch(`/delete-project/${id}`, { method: 'DELETE' });
    } catch (error) {
        console.error("Error deleting project:", error);
    }
}

// Ensure the script runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const projectForm = document.getElementById('projectForm');
    if (projectForm) {
        projectForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const projectName = document.getElementById('projectName').value;
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const description = document.getElementById('description').value;
            const imageFile = document.getElementById('image').files[0];

            // Check which checkboxes are checked
            const technologies = Array.from(document.querySelectorAll('input[type=checkbox]:checked'))
                .map(checkbox => checkbox.value) // Use checkbox.value to get the value directly
                .filter(Boolean); // Filter out any undefined or empty values

            console.log("Technologies selected:", technologies); // Debugging output

            const reader = new FileReader();
            reader.onload = async function (e) {
                const imageSrc = e.target.result;

                await addProjectToDB(projectName, description, startDate, endDate, technologies, imageSrc);
                projectForm.reset();
                document.getElementById('imagePreview').style.display = 'none';
            };

            if (imageFile) {
                reader.readAsDataURL(imageFile);
            }
        });
    }

    // Load existing projects when the page is loaded
    loadProjects();
});
