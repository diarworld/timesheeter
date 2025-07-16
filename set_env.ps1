# Path to your .env file
$envFilePath = ".env" 

# Read the file content
$envContent = Get-Content $envFilePath

# Loop through each line and set the environment variable
foreach ($line in $envContent) {
    # Skip empty lines or comments
    if ($line -notmatch '^\s*$' -and $line -notmatch '^\s*#') {
        # Split the line into key and value
        $parts = $line.Split('=', 2)
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()

            # Set the environment variable
            # For current process scope (temporary):
            # $env:$key = $value

            # For User scope (persistent for the current user):
            [System.Environment]::SetEnvironmentVariable($key, $value, 'User')

            # For Machine scope (persistent for all users, requires admin privileges):
            # [System.Environment]::SetEnvironmentVariable($key, $value, 'Machine')
        }
    }
}