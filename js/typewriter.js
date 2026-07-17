function typeWriter(element, text, speed = 80) {
  // Guard — skip if element doesn't exist
  if (!element) return;

  let i = 0;
  element.setAttribute('data-text', '');

  const interval = setInterval(() => {
    i++;
    // Update data-text one character at a time
    // Both ::before and ::after pseudo-elements read this attribute
    element.setAttribute('data-text', text.slice(0, i));

    if (i === text.length) {
      clearInterval(interval); // stop when fully typed
    }
  }, speed);
}