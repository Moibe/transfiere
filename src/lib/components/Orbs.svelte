<!--
  Fondo "blanco con vivos": manchas de color desenfocadas que flotan despacio detrás del
  panel glass. Puramente decorativo (aria-hidden, sin eventos).
-->
<div class="orbs" aria-hidden="true">
	<span class="orb o1"></span>
	<span class="orb o2"></span>
	<span class="orb o3"></span>
	<span class="orb o4"></span>
	<span class="orb o5"></span>
</div>

<style>
	.orbs {
		position: fixed;
		inset: 0;
		overflow: hidden;
		z-index: 0;
		pointer-events: none;
	}
	.orb {
		position: absolute;
		border-radius: 50%;
		filter: blur(64px);
		opacity: 0.72;
		will-change: transform;
		animation: drift 28s ease-in-out infinite alternate;
	}
	.o1 {
		width: 48vmax;
		height: 48vmax;
		left: -14vmax;
		top: -16vmax;
		background: radial-gradient(circle at 35% 35%, var(--vivid-pink), rgba(255, 45, 117, 0) 70%);
	}
	.o2 {
		width: 42vmax;
		height: 42vmax;
		right: -12vmax;
		top: -10vmax;
		background: radial-gradient(circle, var(--vivid-cyan), rgba(25, 199, 255, 0) 70%);
		animation-delay: -7s;
		animation-duration: 34s;
	}
	.o3 {
		width: 40vmax;
		height: 40vmax;
		left: 18vmax;
		bottom: -18vmax;
		background: radial-gradient(circle, var(--vivid-yellow), rgba(255, 204, 31, 0) 70%);
		animation-delay: -14s;
		animation-duration: 31s;
	}
	.o4 {
		width: 44vmax;
		height: 44vmax;
		right: 6vmax;
		bottom: -20vmax;
		background: radial-gradient(circle, var(--vivid-violet), rgba(124, 58, 237, 0) 70%);
		animation-delay: -20s;
		animation-duration: 37s;
	}
	.o5 {
		width: 26vmax;
		height: 26vmax;
		left: 46vmax;
		top: 28vh;
		opacity: 0.45;
		background: radial-gradient(circle, var(--vivid-lime), rgba(163, 230, 53, 0) 70%);
		animation-delay: -3s;
		animation-duration: 40s;
	}
	@keyframes drift {
		from {
			transform: translate3d(0, 0, 0) scale(1);
		}
		to {
			transform: translate3d(6vmax, 4vmax, 0) scale(1.12);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.orb {
			animation: none;
		}
	}
</style>
