// Torch effect - reveals content as mouse moves
document.addEventListener('DOMContentLoaded', function() {
    const overlay = document.getElementById('overlay');
    
    // Torch radius (size of the reveal circle) - reduced by 20%
    const torchRadius = 150;
    
    // Track mouse position (start at center)
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    
    // Update torch position on mouse move
    function handleMouseMove(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        updateTorch();
    }
    
    document.addEventListener('mousemove', handleMouseMove);
    
    // Update torch position on touch move (for mobile)
    function handleTouchMove(e) {
        if (e.touches.length > 0) {
            e.preventDefault();
            mouseX = e.touches[0].clientX;
            mouseY = e.touches[0].clientY;
            updateTorch();
        }
    }
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    // Update torch effect
    function updateTorch() {
        const x = mouseX;
        const y = mouseY;
        const radius = torchRadius;
        
        // Use viewport dimensions to ensure full coverage
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate mask position - use percentage for better coverage
        const maskSize = Math.max(viewportWidth, viewportHeight) * 2;
        const maskX = x - maskSize / 2;
        const maskY = y - maskSize / 2;
        
        // Create radial gradient for torch effect - softer transition
        // Transparent in center (reveals content), gradually fading to black at edges
        const gradient = `radial-gradient(circle ${radius}px at center, transparent 0%, transparent ${radius * 0.5}px, rgba(0,0,0,0.2) ${radius * 0.6}px, rgba(0,0,0,0.4) ${radius * 0.7}px, rgba(0,0,0,0.6) ${radius * 0.8}px, rgba(0,0,0,0.8) ${radius * 0.9}px, black ${radius}px)`;
        
        // Apply mask - transparent areas reveal content, black areas hide it
        overlay.style.maskImage = gradient;
        overlay.style.webkitMaskImage = gradient;
        overlay.style.maskSize = `${maskSize}px ${maskSize}px`;
        overlay.style.webkitMaskSize = `${maskSize}px ${maskSize}px`;
        overlay.style.maskPosition = `${maskX}px ${maskY}px`;
        overlay.style.webkitMaskPosition = `${maskX}px ${maskY}px`;
        overlay.style.maskRepeat = 'no-repeat';
        overlay.style.webkitMaskRepeat = 'no-repeat';
    }
    
    // Set initial position
    updateTorch();
    
    // Handle window resize
    window.addEventListener('resize', function() {
        // Keep torch at current position or center if mouse is outside
        if (mouseX > window.innerWidth) mouseX = window.innerWidth / 2;
        if (mouseY > window.innerHeight) mouseY = window.innerHeight / 2;
        updateTorch();
    });
});
