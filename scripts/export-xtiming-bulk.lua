-- ============================================================
-- Bulk Export xTiming Files
-- Extracts all timing tracks from selected xLights sequences
-- and packages them into a zip for upload to the repo.
--
-- Usage: Run from xLights → Tools → Run Script
-- ============================================================

Log("=== xTiming Bulk Export ===")

-- Prompt user to select sequences
seqs = PromptSequences()
if #seqs == 0 then
    Log("No sequences selected. Exiting.")
    return
end

Log("Selected " .. #seqs .. " sequence(s)")

-- Determine show directory from first sequence path
local showDir = seqs[1]:match("(.+)[/\\]")
local exportDir = showDir .. "/xtiming_export"
local sep = package.config:sub(1, 1)
local isWin = (sep == "\\")

-- Clean slate — remove previous export dir if it exists
if isWin then
    os.execute('rmdir /s /q "' .. exportDir .. '" 2>nul')
else
    os.execute('rm -rf "' .. exportDir .. '"')
end
os.execute('mkdir "' .. exportDir .. '"')

local totalTracks = 0

for i, seqPath in ipairs(seqs) do
    -- Extract sequence name without extension
    local seqFile = seqPath:match("([^/\\]+)$")
    local seqName = seqFile:match("(.+)%.[^.]+$") or seqFile
    Log("")
    Log("[" .. i .. "/" .. #seqs .. "] " .. seqName)

    -- Read the .xsq / .xml sequence file directly
    local f = io.open(seqPath, "r")
    if not f then
        Log("  ERROR: Could not open " .. seqPath)
    else
        local xml = f:read("*all")
        f:close()

        -- Parse timing elements using a line-by-line state machine.
        -- xLights .xsq files store timing tracks as:
        --   <Element type="timing" name="Lyrics" ...>
        --     <EffectLayer>
        --       <Effect label="word" startTime="1000" endTime="1500"/>
        --     </EffectLayer>
        --   </Element>
        --
        -- We capture everything between the opening and closing Element
        -- tags for type="timing" entries, then write each as a standalone
        -- .xtiming file.

        local inTiming = false
        local trackName = nil
        local trackLines = {}
        local trackAttrs = ""
        local seqTrackCount = 0

        for line in xml:gmatch("[^\r\n]+") do
            if not inTiming then
                -- Match opening Element tag with type="timing"
                -- Handles both attribute orderings
                if line:match('<Element[^>]+type="timing"') then
                    local name = line:match('name="([^"]+)"')
                    if name then
                        inTiming = true
                        trackName = name
                        trackLines = {}
                        -- Capture extra attributes (visible, views, etc.)
                        trackAttrs = line:match("<Element(.-)>") or ""
                    end
                end
            else
                if line:match("</Element>") then
                    -- Write the timing track as a standalone .xtiming file
                    -- Sanitize track name for filesystem
                    local safeName = trackName:gsub('[/\\:*?"<>|]', "_")
                    local outFile = seqName .. " - " .. safeName .. ".xtiming"
                    local outPath = exportDir .. "/" .. outFile

                    local out = io.open(outPath, "w")
                    if out then
                        out:write('<?xml version="1.0" encoding="UTF-8"?>\n')
                        out:write('<timing name="' .. trackName .. '">\n')
                        for _, tl in ipairs(trackLines) do
                            out:write(tl .. "\n")
                        end
                        out:write("</timing>\n")
                        out:close()
                        seqTrackCount = seqTrackCount + 1
                        Log("  Exported: " .. trackName)
                    else
                        Log("  ERROR: Could not write " .. outPath)
                    end

                    inTiming = false
                    trackName = nil
                else
                    table.insert(trackLines, line)
                end
            end
        end

        if seqTrackCount == 0 then
            Log("  No timing tracks found")
        else
            Log("  " .. seqTrackCount .. " track(s)")
        end
        totalTracks = totalTracks + seqTrackCount
    end
end

Log("")
Log("Total: " .. totalTracks .. " timing tracks from " .. #seqs .. " sequences")

-- Create zip file
local zipPath = showDir .. "/xtiming_export.zip"

-- Remove old zip if it exists
os.remove(zipPath)

local zipOk = false
if isWin then
    zipOk = os.execute(
        'powershell -NoProfile -Command "Compress-Archive -Path \''
            .. exportDir
            .. "\\*' -DestinationPath '"
            .. zipPath
            .. "' -Force\""
    )
else
    zipOk = os.execute('cd "' .. showDir .. '" && zip -rj "xtiming_export.zip" "xtiming_export/"')
end

Log("")
if zipOk then
    Log("ZIP created: " .. zipPath)
    Log("Upload this file to the repo.")
else
    Log("Could not create zip automatically.")
    Log("Manually zip the folder: " .. exportDir)
end
