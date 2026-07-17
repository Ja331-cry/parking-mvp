$git = 'C:\Program Files\Git\cmd\git.exe'
& $git add .
& $git commit -m "fix: use createMany to avoid Vercel timeout during DB seed"
& $git push origin main
