$git = 'C:\Program Files\Git\cmd\git.exe'

# Configure git
& $git config --global user.email "ja331-cry@users.noreply.github.com"
& $git config --global user.name "Ja331-cry"

# Initialize and commit
& $git init
& $git add .
& $git commit -m "Initial commit for Vercel deployment"
& $git branch -M main

# Add remote and push
& $git remote add origin https://github.com/Ja331-cry/parking-mvp.git
& $git push -u origin main
