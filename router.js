const express = require('express');
const pool = require('./db');
const bcrypt = require('bcryptjs');
const methodOverride = require('method-override');
const multer = require('multer');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const app = express();
const PORT = process.env.PORT || 5501;
const storage = multer.memoryStorage();
const upload = multer({ storage });
require("dotenv").config();
// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

app.use(session({
  name: 'my-sesssion',
  secret: 'your_secret_key',  // Ganti dengan secret key Anda
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: true,  // Set true jika menggunakan HTTPS (di produksi)
    httpOnly: true,
    
    maxAge: 1000 * 60 * 60 * 24 // 1 hari
  }
}));

app.get('/login-anonymous', (req, res) => {
    req.session.anonymousId = `anon_${Date.now()}`;  // Unique anonymous ID based on timestamp
    res.redirect('/');  // Redirect to the homepage or wherever you need
});



app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});



// Static assets and view engine setup
const path = require('path');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
// app.use("/views", express.static("views")); //disable in deploment
app.use("/assets", express.static(path.join(__dirname, "assets")));
// app.use("/assets/css", express.static("assets/css"));
// app.use("/assets/js", express.static("assets/js"));
// app.use("/assets/img", express.static("assets/img"));

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.status(403).json({ error: 'Please log in first.' });
}



app.get("/", (req, res) => (console.log("Current user: ", req.session.user), res.render("index", {user: req.session.user})));

// app.get("/", async (req, res) => {
//     if (!req.session.userId) {
//         return res.redirect("/login"); // Redirect if user is not logged in
//     }

//     try {
//         const result = await pool.query(
//             "SELECT * FROM projects WHERE user_id = $1",
//             [req.session.userId]
//         );
//         const projects = result.rows.map(project => ({
//             ...project,
//             duration: calculateDuration(project.start_date, project.end_date),
//             technologies: JSON.parse(project.technologies || '[]')
//         }));

//         res.render("index", { user: req.session.user, projects });
//     } catch (err) {
//         console.error("Error fetching user's projects:", err);
//         res.status(500).send("Server error");
//     }
// });

app.get("/add-project", (req, res) => res.render("blog"));
app.get("/contact", (req, res) => res.render("contact"));
app.get("/testimonial", (req, res) => res.render("testimonial"));
app.get("/blog-detail", (req, res) => res.render("blog_detail"));
app.get("/edit-project", (req, res) => res.render("edit_project"));
app.get("/register", (req, res) => res.render("register"));
app.get("/login", (req, res) => res.render("login"));

// Register route
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3)', [username, email, hashedPassword]);

        res.redirect('/login'); // Redirect to login page after successful registration
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});



/// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'User does not exist.' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect password.' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;

        // res.json({ message: 'Login successful' });
        req.session.user = user
        res.redirect('/');
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Add a new project (protected route)
app.post('/add-project', async (req, res) => {
    const { title, description, startDate, endDate, technologies, imageUrl} = req.body;
    const userId = req.session.userId;
    try {
        if (!title || !description || !startDate || !endDate || !imageUrl) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        // Properly format technologies
        const technologiesJSON = Array.isArray(technologies) ? JSON.stringify(technologies) : JSON.stringify([technologies]);

        const result = await pool.query(
            'INSERT INTO projects (title, description, start_date, end_date, technologies, image_url, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [title, description, startDate, endDate, technologiesJSON, imageUrl, userId]
        );

        res.status(201).json({ id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Update project route (PUT /update-project/:id)
app.put('/update-project/:id', upload.single('image'), async (req, res) => {
    const id = parseInt(req.params.id);
    const { title, description, start_date, end_date, technologies, image_url } = req.body;

    try {
        if (!title || !description || !start_date || !end_date) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);

        if (projectResult.rowCount === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const project = projectResult.rows[0];

        // Allow any anonymous user to update their own anonymous project or any other anonymous project
        if (project.user_id !== req.session.userId && project.user_id !== null) {
            return res.status(403).json({ error: 'Unauthorized to edit this project' });
        }

        const technologiesJSON = JSON.stringify(Array.isArray(technologies) ? technologies : [technologies]);

        await pool.query(
            'UPDATE projects SET title = $1, description = $2, start_date = $3, end_date = $4, technologies = $5, image_url = $6 WHERE id = $7',
            [title, description, start_date, end_date, technologiesJSON, image_url, id]
        );

        res.redirect("/");
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.get('/blog-detail/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(`
            SELECT projects.*, COALESCE(users.username, 'Anonymous') AS author
            FROM projects
            LEFT JOIN users ON projects.user_id = users.id
            WHERE projects.id = $1
        `, [id]);

        if (result.rowCount === 0) {
            // Project not found, handle as needed
            return res.status(404).send('Project not found');
        }

        const project = result.rows[0];
        project.duration = calculateDuration(project.start_date, project.end_date);
        project.technologies = JSON.parse(project.technologies || '[]');

        res.render('blog_detail', { blog: project });
    } catch (err) {
        console.error('Error fetching project details:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});



// Edit project route (GET /edit-project/:id)
app.get('/edit-project/:id', async (req, res) => {
    const { id } = req.params;
    const projectId = parseInt(id, 10);

    if (isNaN(projectId)) {
        return res.status(400).send('Invalid project ID');
    }

    try {
        const result = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);

        if (result.rows.length === 0) {
            return res.status(404).send('Project not found');
        }

        const project = result.rows[0];

        // Allow any anonymous user to edit their own anonymous project or any other anonymous project
        if (project.user_id !== req.session.userId && project.user_id !== null) {
            return res.status(403).send('Unauthorized to edit this project');
        }

        project.technologies = JSON.parse(project.technologies || '[]');
        const allTechnologies = ['Node JS', 'React JS', 'Next JS', 'Type Script'];
        project.technologyCheck = allTechnologies.map(tech => ({
            name: tech,
            checked: project.technologies.includes(tech)
        }));

        res.render('edit_project', { project });
    } catch (err) {
        console.error('Error fetching project:', err);
        res.status(500).send('Server error');
    }
});


// Delete project
app.delete('/delete-project/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const project = result.rows[0];

        // Allow any anonymous user to delete their own anonymous project or any other anonymous project
        if (project.user_id !== req.session.userId && project.user_id !== null) {
            return res.status(403).json({ error: 'Unauthorized to delete this project' });
        }

        await pool.query('DELETE FROM projects WHERE id = $1', [id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});


// Get all projects
app.get('/projects', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT projects.*, users.username AS author
            FROM projects
            LEFT JOIN users ON projects.user_id = users.id
        `);
        
        const projects = result.rows.map(project => ({
            ...project,
            author: project.author || 'anonymous',  // Set 'anonymous' if author is null
            technologies: JSON.parse(project.technologies || '[]'),
            duration: calculateDuration(project.start_date, project.end_date)
        }));
        
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});


// Helper function to calculate project duration
function calculateDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate) || isNaN(endDate)) return 'Invalid dates';

    const duration = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
    const months = Math.floor(duration / 30);
    const days = duration % 30;
    return `${months} month(s) and ${days} day(s)`;
}

// app.post('/logout', (req, res) => {
//     req.session.destroy(err => {
//         if (err) return res.status(500).json({ error: 'Failed to log out' });
//         res.redirect('/');
//     });
// });

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Failed to log out' });
        res.redirect('/');
    });
});


// Start the server
// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });

module.exports = app;
