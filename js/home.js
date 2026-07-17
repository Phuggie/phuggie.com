window.addEventListener('load', () => {
  positionEmbed();
  updateTwitchEmbed();
  typeWriter(document.querySelector('.intro h1'), 'twitch.tv/Phuggie', 80);
});

window.addEventListener('resize', positionEmbed);