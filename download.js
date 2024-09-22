(() => {

    const downloader = _d = {

        trigger: {
            onInit: () => {
                _d.directory.init();
            },
            onDirectory: () => {
                _d.pages.fetch();  
            },
            onCollected: () => {
                _d.save({
                    url: "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(_d.videos.list, null, 2)),
                    filename: 'collected_videos.json'
                });
                if (_d.videos.errors.filename > 0) {
                    _d.toast("There are clips with non-unique file names (" + _d.videos.errors.filename + "). All of them are opened in new browser windows, please update them with unique file names and run again.");
                    return;
                }
                // console.log(_d.videos.queue);
                _d.videos.get();
            },
        },
        
        toast: (text, message = {}) => {
            alert(text);
        },
        
        log: {
            // lines: [''],
            out: (line, options = {}) => {
                console.log(line);
                // _d.log.lines[Math.max(0, _d.log.lines.length - 1)] += line;
                // console.clear();
                // _d.log.lines.forEach((l) => {
                //     console.log(l);
                // });
                // if (
                //     typeof options.break != "undefined" && 
                //     options.break === true
                // ) { 
                //     _d.log.lines.push('');
                // }
                // console.log(JSON.stringify(_d.log.lines, null, 2));
            }
        },

        save: (options) => {
            const trigger = document.querySelector('[data-downloader-role="trigger"]') || document.createElement('a');
            if (!trigger.getAttribute("data-downloader-role")) {
                trigger.setAttribute("data-downloader-role", "trigger");
                document.body.appendChild(trigger);
            }
            if (
                typeof options.url != "undefined" &&
                typeof options.filename != "undefined"
            ) {
                trigger.setAttribute("href", options.url);
                trigger.setAttribute("download", options.filename);
                trigger.click();
            }
        },

        directory: {
            handle: null,
            init: () => {
                window.showDirectoryPicker()
                    .then((handle) => {
                        _d.directory.handle = handle;
                        _d.trigger.onDirectory();
                    })
                    .catch(function (err) {
                        toast('Error selecting directory (check console logs)');
                        console.log(err);
                    });
            }
        },

        clock: {},

        videos: {
            current: -1,
            processing: 0,
            errors: {
                filename: 0
            },
            processed: (page = null) => {
                _d.videos.processing -= 1;
                if (
                    _d.videos.processing === 0 &&
                    page === _d.pages.total
                ) {
                    _d.trigger.onCollected();
                }
            },
            queue: [],
            list: {},
            get: () => {
                _d.videos.current += 1;
                const clip = _d.videos.queue[_d.videos.current];
                fetch(
                    "https://api.gopro.com/media/" +
                    clip.id +
                    "/download", 
                    {
                        "headers": {
                            "accept": "application/vnd.gopro.jk.media.search+json; version=2.0.0",
                            "accept-language": "en-US,en;q=0.9,pl;q=0.8",
                            "origin": "https://gopro.com"
                        },
                        "referrer": "https://gopro.com/",
                        "body": null,
                        "method": "GET",
                        "credentials": "include"
                    }
                )
                    .then((response) => response.json())
                    .then((data) => { 
                        clip.download = data._embedded.variations.find(v => typeof v.label != "undefined" && v.label === "source");
                        clip.urls = data._embedded || null;
                        const url = clip.download?.url || null;
                        if (url) {
                            _d.log.out("Downloading '" + clip.filename + "'.", { clear: true });
                            _d.videos.processing += 1;
                            _d.save({
                                url: url,
                                filename: clip.filename
                            });
                            _d.clock[clip.filename] = setInterval(() => {
                                _d.directory.handle
                                    .getFileHandle(clip.filename)
                                        .then((file) => {
                                            _d.log.out("'" + clip.filename + "' downloaded, moving on to the next file.", { clear: true });
                                            clearInterval(_d.clock[clip.filename]);
                                            _d.videos.processing -= 1;
                                            _d.save({
                                                url: "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clip, null, 2)),
                                                filename: clip.filename + '.json'
                                            });
                                            _d.videos.get();
                                        })
                                        .catch((err) => {
                                            // shh
                                        });
                            }, 500);
                        }
                    });
            },
            add: (page, clip) => {
                // skip unsupported types and extensions
                if (
                    typeof clip.id != "undefined" &&
                    typeof clip.type != "undefined" &&
                    typeof clip.file_extension != "undefined" &&
                    ["MultiClipEdit"].includes(clip.type) === false &&
                    ["json"].includes(clip.file_extension) === false
                ) {
                    if (
                        clip.filename === "" ||
                        typeof _d.videos.list[clip.filename] != "undefined"
                    ) {
                        _d.videos.errors.filename += 1;
                        window.open("https://gopro.com/media-library/" + clip.id + "/", '_blank', true);
                        _d.videos.processed(page);
                        return;
                    }
                    _d.directory.handle
                        .getFileHandle(clip.filename)
                            .then((file) => {
                                _d.log.out("Skipping '" + clip.filename + "' (already downloaded).", { clear: true });
                                _d.videos.processed(page);
                            })
                            .catch((err) => {
                                // check for a meta file as well
                                _d.directory.handle
                                    .getFileHandle(clip.filename + '.json')
                                        .then((file) => {
                                            _d.log.out("Skipping '" + clip.filename + "' ('" + clip.filename + ".json' file found in the download folder).", { clear: true });
                                            _d.videos.processed(page);
                                        })
                                        .catch((err) => {
                                            if (typeof _d.videos.list[clip.type] == "undefined") {
                                                _d.videos.list[clip.type] = {};
                                            }
                                            if (typeof _d.videos.list[clip.type][clip.file_extension] == "undefined") {
                                                _d.videos.list[clip.type][clip.file_extension] = {};
                                            }
                                            _d.videos.list[clip.type][clip.file_extension][clip.filename] = clip;
                                            _d.videos.queue.push(clip);
                                            _d.videos.processed(page);
                                        });
                            });
                } else {
                    _d.videos.processed(page);
                }
            }
        },

        pages: {
            current: 1,
            total: null,
            fetch: () => {
                _d.log.out("Collecting page " + _d.pages.current + "...");
                fetch(
                        "https://api.gopro.com/media/search" +
                        "?processing_states=rendering,pretranscoding,transcoding,ready" + 
                        "&fields=camera_model,captured_at,content_title,content_type,created_at,gopro_user_id,gopro_media,filename,file_extension,file_size,height,fov,id,item_count,mce_type,moments_count,on_public_profile,orientation,play_as,ready_to_edit,ready_to_view,resolution,source_duration,token,type,width,submitted_at,thumbnail_available,captured_at_timezone,available_labels" + 
                        "&type=Burst,BurstVideo,Continuous,LoopedVideo,Photo,TimeLapse,TimeLapseVideo,Video,MultiClipEdit" + 
                        "&page=" + downloader.pages.current + "&per_page=100", 
                        {
                            "headers": {
                                "accept": "application/vnd.gopro.jk.media.search+json; version=2.0.0",
                                "accept-language": "en-US,en;q=0.9,pl;q=0.8",
                                "origin": "https://gopro.com"
                            },
                            "referrer": "https://gopro.com/",
                            "body": null,
                            "method": "GET",
                            "credentials": "include"
                        }
                )
                    .then((response) => response.json())
                    .then((data) => { 
                        _d.log.out(" done.", { break: true });
                        if (
                            data &&
                            typeof data._embedded != "undefined" &&
                            typeof data._embedded.media != "undefined" &&
                            typeof data._pages != "undefined" &&
                            typeof data._pages.total_pages != "undefined" &&
                            typeof data._pages.current_page != "undefined" &&
                            typeof data._pages.total_pages != "undefined"
                        ) {
                            // data._pages.total_pages = 2;
                            if (_d.pages.total == null) {
                                _d.pages.total = data._pages.total_pages;
                            }
                            _d.videos.processing += data._embedded.media.length;
                            data._embedded.media.forEach((clip) => {
                                _d.videos.add(data._pages.current_page, clip);
                            });
                            if (data._pages.current_page < data._pages.total_pages) {
                                _d.pages.current = data._pages.current_page + 1;
                                _d.pages.fetch();
                            }
                        }
                    });
            }
        }, 
    }
    
    _d.trigger.onInit();
    
})();
