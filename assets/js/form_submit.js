// import emailjs from 'emailjs-com';
// Function to handle form submission
function handleSubmit(event) {
    
    event.preventDefault(); // Prevent the form from submitting the default way
    // Get form values
    const name = document.getElementById('id_input').value;
    const email = document.getElementById('id_email').value;
    const phone = document.getElementById('id_tel').value;
    const subject = document.getElementById('id_sub').value;
    const message = document.getElementById('id_message').value;
    emailjs.init({
        publicKey: "zt5n8xw4EvEOXZBJj"
    });
    // Create the data object to send
    const templateParams = {
        from_name: name,
        email_id: email,
        phone_id: phone,
        subject_id: subject,
        message_id: message
    };

    // Send the email via EmailJS
    emailjs.send("service_3zbvpyl", "template_5f1wu2r", templateParams).then(function(response) {
            console.log("SUCCESS!", response.status, response.text);
            alert("Your message has been sent successfully!");
        }, function(error) {
            console.log("FAILED...", error);
            alert("Failed to send the message. Please try again.");
        });
}

// console.log("hello")
// Attach the submit event listener
document.getElementById('contactForm').addEventListener('submit', handleSubmit);