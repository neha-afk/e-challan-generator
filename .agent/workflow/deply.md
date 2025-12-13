markdown 
# Deployment Workflow 
1. Ensure all changes are committed and pushed to main 
2. Verify render.yaml exists at project root 
3. In Render dashboard: - New Blueprint Instance - Connect GitHub repo - Add environment variables - Trigger build 
4. Test production URL for: - Auth flow - Manufacturing orders CRUD - Work orders functionality - Stock ledger updates 
CRITICAL REMINDERS FOR ALL ROLES 
1. After each prompt, verify the output - don't blindly accept. Check that:  
o Files were created in correct locations 
o Imports are valid 
o TypeScript has no errors 
o The app runs with npm run dev 
2. If an agent fails twice, switch models: @claude or try rephrasing the prompt 
3. Turbo Mode Safety: Only enable for your branch directory, not system-wide 
4. Every 30 minutes: Stop and verify the "vibe" - does the app match the intended design? Is 
the code quality acceptable? 
5. Merge conflicts: Don't resolve manually - use agent: "Analyze the conflict in [file]. Preserve 
[specific functionality] from my branch but adopt [specific aspect] from main. Generate the 
resolved code."