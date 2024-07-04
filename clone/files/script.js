document.addEventListener('DOMContentLoaded', function() {
    const welcomeText = document.querySelector('.full-width');
  
    welcomeText.addEventListener('mouseover', function(event) {
      const target = event.target;
      if (target.classList.contains('letter')) {
        target.style.color = 'red'; // Change the color of the letter hovered over
      } else {
        welcomeText.style.color = 'red'; // Change the color of the whole text
      }
    });
  
    welcomeText.addEventListener('mouseout', function(event) {
      const target = event.target;
      if (target.classList.contains('letter')) {
        target.style.color = ''; // Reset the color of the letter
      } else {
        welcomeText.style.color = ''; // Reset the color of the whole text
      }
    });
  });
  