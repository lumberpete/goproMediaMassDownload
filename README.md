# goproMediaMassDownload
A simple script to automatically download all media from the GoPro Media Library, with metadata

## Usage
Log into the Media Library, and paste the JS code into the browser's dev console, or use the Sources > Snippets feature to run it.

1. It'll ask you to choose the directory that the script will scan for existing files - it's required to run the script multiple times and avoid downloading files that are already downloaded
  - Make sure that you set the same directory as the default Downloads directory for the time being, so that the files actually end up where the script looks for them
2. Then the script will scan your Media Library for media files
  - For the directory scanning filter to work, each file has to have a file name set up on the GoPro's side
  - The scanning process will open a browser window for each file without a unique file name and will ask you to add these file names after the scan is finished
  - You can use any names, a simple 'video1', 'video2' can work well
3. If there were media files in your library without unique file names, you'll have to rerun the script after setting them
4. After successfully completing the scan, the script will start downloading your media files to the default download directory
  - Each file will be accompanied with a `.json` file that contains the corresponding meta information that GoPro has for the media file in their database  
5. It is recommended to rerun the script a bunch of times, just to make sure that every media file was actually captured
  - If you run out of space in the download directory, you can move the downloaded media files someplace else, but don't move their `.json` meta information files - this way the already downloaded media files will still be properly skipped 
