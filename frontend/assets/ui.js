(function(){
  const navMap = {"/index.html":"home","/":"home","/library.html":"library","/exercise.html":"exercise"};
  function setActiveNav(){
    const path = location.pathname.replace(/\/+$/,'/') || "/";
    const key = Object.keys(navMap).find(k => path.endsWith(k)) || "/";
    const active = navMap[key];
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.getAttribute('data-id')===active));
  }
  document.addEventListener('DOMContentLoaded', setActiveNav);
})();
