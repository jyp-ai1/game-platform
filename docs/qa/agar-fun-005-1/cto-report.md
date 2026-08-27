## AGAR-FUN-005.1 CTO REPORT

Collision coordinate: Physics vs Render deviation: 0 px

Normal:
Contact false-positive: 0
Contact false-negative: 0

Network:
50ms: PASS
100ms: PASS
200ms: PASS

Split: PASS
Virus: PASS

Max visual/physics deviation: 0 px

Root cause:
1) AGAR_COLLIDE_EPS=1.5 fired auth before visible discs touched.
2) YOU/other CSS border + border-box inset shrunk the filled disc below massToRadius.
3) Virus spike clip-path had no solid disc underlay → visual gaps inside the collision circle.

Fix:
eps=0 (auth ≡ disc overlap); render fill = 2*massToRadius with outline chrome (no border inset); virus solid disc underlay = massToRadius.

Commit: (filled after push)
Preview: (filled after deploy)
Production: HOLD
