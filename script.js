// Parallax for space layers (moon + stars). Lightweight and respects user preferences.
(function(){
	const moon = document.getElementById('scene-moon');
	const starsFar = document.querySelector('.stars--far');
	const starsNear = document.querySelector('.stars--near');

	// Respect reduced motion
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
	if (!moon && !starsFar && !starsNear) return;
	if (reduced || isTouch) {
		// Keep static subtle transforms
		if (moon) moon.style.transform = 'translate3d(0,0,0)';
		return;
	}

	let mouseX = 0, mouseY = 0;
	let rx = 0, ry = 0;

	function onMove(e){
		const clientX = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0;
		const clientY = e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || 0;
		const cx = window.innerWidth/2;
		const cy = window.innerHeight/2;
		mouseX = (clientX - cx) / cx; // -1..1
		mouseY = (clientY - cy) / cy; // -1..1
	}

	function raf(){
		// smooth the motion
		rx += (mouseX - rx) * 0.08;
		ry += (mouseY - ry) * 0.08;

		// Apply transforms (lesser for far stars, stronger for near and moon)
		if (starsFar) starsFar.style.transform = `translate3d(${rx*8}px,${ry*6}px,0)`;
		if (starsNear) starsNear.style.transform = `translate3d(${rx*18}px,${ry*14}px,0)`;
		if (moon) moon.style.transform = `translate3d(${rx*28}px,${ry*22}px,0) rotate(${rx*4}deg)`;

		requestAnimationFrame(raf);
	}

	window.addEventListener('mousemove', onMove, {passive:true});
	window.addEventListener('touchmove', onMove, {passive:true});
	requestAnimationFrame(raf);

})();
