import "android.app.*"
import "android.os.*"
import "android.widget.*"
import "android.view.*"
import "android.content.*"
import "java.util.*"
import "java.lang.*"
import "android.*"
import "android.graphics.drawable.*"
import "android.graphics.PixelFormat"
import "android.view.animation.Animation"
import "android.view.animation.RotateAnimation"
import "android.animation.ObjectAnimator"
import "android.view.animation.DecelerateInterpolator"

-- [[ PRINZVAN ULTIMATE - ASSET CONFIG ]]
local SAFE_DIR = gg.EXTRACT_DIR or "/storage/emulated/0/Download"
local ICON_PATH = SAFE_DIR .. "/ic.png"
local ICON_URL = "https://sharebooster.neocities.org/ic.png"

-- [[ 1. AUTO-DOWNLOAD LOGO LOGIC ]]
local function prepareIcon()
    -- Check if valid icon already exists (Check PNG signature)
    local f = io.open(ICON_PATH, "rb")
    if f then 
        local sig = f:read(4)
        f:close()
        if sig == "\137PNG" then return true end
    end
    
    gg.toast("Bypassing Logo...")
    local req = gg.makeRequest(ICON_URL)
    
    if req and req.content then
        -- Verify if downloaded data is a real PNG image
        if req.content:sub(1, 4) == "\137PNG" then
            local file = io.open(ICON_PATH, "wb") 
            if file then
                file:write(req.content)
                file:close()
                gg.toast("Logo Bypassed ✅")
                return true
            end
        else
            gg.alert("Error: Downloaded file is not a valid image. Using default icon.")
        end
    end
    return false
end

-- Run the download check
prepareIcon()

context = activity
window = context.getSystemService ( "window" )

local mObjectAnimator
local dObjectAnimator

function sparkle_animation ( view )
    if ( mObjectAnimator == nil ) then
        mObjectAnimator = ObjectAnimator.ofFloat ( view , "alpha" , 0 , 1 )
        mObjectAnimator.setDuration ( 800 )
        mObjectAnimator.setInterpolator ( DecelerateInterpolator ( ) )
    end
end

function zoom_animation ( view )
    if ( dObjectAnimator == nil ) then
        dObjectAnimator = ObjectAnimator.ofFloat ( view , "scaleX" , 0 , 1 )
        dObjectAnimator.setDuration ( 600 )
        dObjectAnimator.setInterpolator ( DecelerateInterpolator ( ) )
    end
end

function zoom_startanimation ( ) dObjectAnimator.start ( ) end
function sparkle_startanimation ( ) mObjectAnimator.start ( ) end

function getLayoutParams ( )
    local LayoutParams = WindowManager.LayoutParams
    local layoutParams = luajava.new ( LayoutParams )
    if ( Build.VERSION.SDK_INT >= 26 ) then
        layoutParams.type = LayoutParams.TYPE_APPLICATION_OVERLAY
    else
        layoutParams.type = LayoutParams.TYPE_PHONE
    end
    layoutParams.format = PixelFormat.RGBA_8888
    layoutParams.flags = LayoutParams.FLAG_NOT_FOCUSABLE
    layoutParams.gravity = Gravity.CENTER
    layoutParams.width = LayoutParams.WRAP_CONTENT
    layoutParams.height = LayoutParams.WRAP_CONTENT
    return layoutParams
end

function getShepeBackground ( color , radiu, strokeWidth, strokeColor )
    drawable = luajava.new ( GradientDrawable )
    drawable.setShape ( GradientDrawable.RECTANGLE )
    drawable.setColor ( color )
    drawable.setCornerRadii ( { radiu , radiu , radiu , radiu , radiu , radiu , radiu , radiu } )
    if strokeWidth then
        drawable.setStroke(strokeWidth, strokeColor)
    end
    return drawable
end

local COLOR_BG     = 0xFF121212 
local COLOR_ACCENT = 0xFF00E5FF 
local COLOR_CARD   = 0xFF1E1E1E 
local COLOR_TEXT   = 0xFFFFFFFF 

xfc = {
    LinearLayout ;
    id = "touch" ;
    layout_height = "fill" ;
    orientation = "vertical" ;
    layout_width = "fill" ;
    background = getShepeBackground ( COLOR_BG , 30, 3, COLOR_ACCENT ) ;
    {
        LinearLayout ;
        id = "ooo" ;
        layout_height = "320dp" ;
        orientation = "vertical" ;
        layout_width = "260dp" ;
        padding = "10dp";
        {
            LinearLayout ;
            layout_height = "40dp" ;
            layout_width = "match_parent" ;
            gravity = "center_vertical";
            {
                TextView ;
                id = "title" ;
                layout_height = "match_parent" ;
                layout_width = "match_parent" ;
                text = "PRINZVAN ULTIMATE" ;
                textColor = COLOR_ACCENT ;
                textSize = "16sp";
                gravity = "center" ;
                layout_weight = "1";
            } ;
            {
                TextView ;
                id = "control" ;
                layout_height = "match_parent" ;
                layout_width = "40dp" ;
                text = "❌" ;
                textColor = "0xFFFF4081" ;
                gravity = "center" ;
            } ;
        } ;
        {
            View; 
            layout_height = "1dp";
            layout_width = "match_parent";
            background = getShepeBackground(0x33FFFFFF, 0);
        };
        {
            ScrollView ;
            layout_height = "match_parent" ;
            padding = "5dp" ;
            layout_width = "match_parent" ;
            VerticalScrollBarEnabled = false ;
            {
                LinearLayout ;
                layout_height = "match_parent" ;
                orientation = "vertical" ;
                id = "FuncLayout" ;
                layout_width = "match_parent" ;
            } ;
        } ;
    } ;
} ;

xfq = {
    LinearLayout ;
    layout_height = "fill" ;
    layout_width = "fill" ;
    {
        LinearLayout ;
        layout_width = "50dp" ;
        {
            ImageView ;
            layout_width = "50dp" ;
            -- Now uses the absolute ICON_PATH instead of just "ic.png"
            src = (io.open(ICON_PATH, "r") and ICON_PATH) or "@android:drawable/ic_menu_gallery" ;
            id = "suspended_ball" ;
            layout_height = "50dp" ;
        } ;
    } ;
} ;

mainLayoutParams = getLayoutParams ( )
xfq = loadlayout ( xfq )
xfc = loadlayout ( xfc )

function control.onLongClick ( v ) luajava.exit() end

function suspended_ball.onClick ( v )
    window.removeView ( xfq )
    zoom_animation ( ooo )
    zoom_startanimation ( )
    window.addView ( xfc , mainLayoutParams )
end

function control.onClick ( v )
    window.removeView ( xfc )
    sparkle_animation ( suspended_ball )
    sparkle_startanimation ( )
    window.addView ( xfq , mainLayoutParams )
end

function suspended_ball.onTouch ( v , event )
    local Action = event.getAction ( )
    if Action == MotionEvent.ACTION_DOWN then
        RawX, RawY = event.getRawX ( ), event.getRawY ( )
        x, y = mainLayoutParams.x, mainLayoutParams.y
    elseif Action == MotionEvent.ACTION_MOVE then
        mainLayoutParams.x = tonumber ( x ) + ( event.getRawX ( ) - RawX )
        mainLayoutParams.y = tonumber ( y ) + ( event.getRawY ( ) - RawY )
        window.updateViewLayout ( xfq , mainLayoutParams )
    end
end

function touch.onTouch ( v , event )
    local Action = event.getAction ( )
    if Action == MotionEvent.ACTION_DOWN then
        RawX, RawY = event.getRawX ( ), event.getRawY ( )
        x, y = mainLayoutParams.x, mainLayoutParams.y
    elseif Action == MotionEvent.ACTION_MOVE then
        mainLayoutParams.x = tonumber ( x ) + ( event.getRawX ( ) - RawX )
        mainLayoutParams.y = tonumber ( y ) + ( event.getRawY ( ) - RawY )
        window.updateViewLayout ( xfc , mainLayoutParams )
    end
end

function setUi ( arr )
    function invoke ( )
        sparkle_animation ( suspended_ball )
        sparkle_startanimation ( )
        if type ( arr ) ~= 'table' then return error ( 'Table expected' ) end
        for i = 1 , # arr do
            local value = arr [ i ]
            if not value.text then value.text = string.format ( 'Mod %d' , i ) end
            local itemGroup = LinearLayout(context)
            itemGroup.setOrientation(1)
            itemGroup.setPadding(0, 10, 0, 10)
            local Controllibrary = {
                Switch = function ( )
                    local sw = loadlayout ({
                        Switch ;
                        text = value.text ;
                        textColor = value.textColor or COLOR_TEXT ;
                        layout_width = "match_parent" ;
                    })
                    sw.onClick = function ( )
                        local mode = sw.checked and "open" or "close"
                        local func = value [ mode ]
                        local newRun = luajava.createProxy ( "java.lang.Runnable" , { run = function() pcall(func, value) end })
                        luajava.newInstance ( "java.lang.Thread" , newRun ):start()
                    end
                    itemGroup.addView ( sw )
                end;
                Button = function ( )
                    local btn = loadlayout ({
                        Button ;
                        text = value.text ;
                        textColor = value.textColor or COLOR_TEXT ;
                        background = getShepeBackground(COLOR_CARD, 15);
                        layout_width = "match_parent" ;
                    })
                    btn.onClick = function ( )
                        local func = value [ "clickEvent" ]
                        local newRun = luajava.createProxy ( "java.lang.Runnable" , { run = function() pcall(func, value) end })
                        luajava.newInstance ( "java.lang.Thread" , newRun ):start()
                    end
                    itemGroup.addView ( btn )
                end
            }
            if Controllibrary [ value.isControl ] then
                Controllibrary [ value.isControl ] ( )
            end
            FuncLayout.addView(itemGroup)
        end
        window.addView ( xfq , mainLayoutParams )
        Looper.loop ( )
    end
    Lock.Ui(invoke,nil,function(err) print(err) luajava.exit() end)
end
--------------------------------------------------
-- 🛡️ PRINZVAN ULTIMATE - PRO EDITION (v2.3)
--------------------------------------------------

-- 1. 🔒 SECURITY GATEWAY
if print ~= _G.print or tostring(load) == "nil" then
    gg.alert("❌ Security Breach: Environment Tampered")
    os.exit()
end

local PASS       = _G.u_p 
local CONFIG_URL = "https://my-api-key-pi.vercel.app/api/config.js"
local SECRET_KEY = "PRINZ_GUARD_99"

local scanned = false
local V1, V2, V3, V4, V5 = {}, {}, {}, {}, {}

local CLR_TITLE  = "0xFFFF004F" 
local CLR_HEAD   = "0xFF00E5FF" 
local CLR_TEXT   = "0xFFFFFFFF" 
local CLR_ACCENT = "0xFFE91E63" 
local CLR_SYSTEM = "0xFF9E9E9E" 

-- [ DECRYPTION HELPERS ]
local function decrypt(hex, key)
    if not hex then return nil end
    hex = hex:gsub("[^%x]", "") 
    local str = ""
    for i = 1, #hex, 2 do
        local pair = hex:sub(i, i+1)
        if #pair == 2 then
            local byte = tonumber(pair, 16)
            local key_char = key:byte(((i-1)/2 % #key) + 1)
            str = str .. string.char(byte ~ key_char)
        end
    end
    return (#str > 0) and str or nil
end

local function getCloudData(taskType)
    local body = string.format('{"pass":"%s", "type":"%s"}', (PASS or "N/A"), taskType)
    local res = gg.makeRequest(CONFIG_URL, {["Content-Type"] = "application/json"}, body)
    if res and res.content ~= "" and res.content ~= "DENIED" then
        return decrypt(res.content, SECRET_KEY)
    end
    return nil
end

--------------------------------------------------
-- [1] SECURITY & BYPASS
--------------------------------------------------

function BYPASS_ANTIBAN()
    gg.toast("🛡️ Shielding Memory...")
    gg.setRanges(gg.REGION_ANONYMOUS)
    local bypassList = {":Report", ":report", ":reported", ":disconnect", ":disconnected", ":Clear", ":Logs", ":libcsharp", ":libcsharp.so", ":liblogic.so", ":liblogic"}
    for _, target in ipairs(bypassList) do
        gg.searchNumber(target, gg.TYPE_BYTE, false, gg.SIGN_EQUAL, 0, -1, 0)
        local results = gg.getResults(10000)
        if #results > 0 then gg.editAll("0", gg.TYPE_BYTE) end
        gg.clearResults()
    end
    gg.alert("✅ Deep Memory Bypass Enabled")
end

--------------------------------------------------
-- [2] MAP VISUAL FUNCTIONS
--------------------------------------------------

function ULTIMATE_MAPHACK() 
    local cloudVal = getCloudData("maphack")
    if not cloudVal then gg.toast("❌ Cloud Sync Failed"); return end
    gg.clearResults()
    gg.setRanges(gg.REGION_ANONYMOUS)
    gg.searchNumber("2.25F;9.18354962e-41F;1.40129846e-45F", gg.TYPE_FLOAT)
    gg.refineNumber("2.25", gg.TYPE_FLOAT)
    local r = gg.getResults(250)
    if #r > 0 then
        for _, v in ipairs(r) do v.value = tonumber(cloudVal) end
        gg.setValues(r)
        gg.toast("📍 Radar Hack (Icons) Active")
    end
end

function map() 
    gg.setRanges(gg.REGION_ANONYMOUS)
    gg.clearResults()
    gg.searchNumber("98,784,247,822;47,244,640,279;4,510,805,388,492,275,723;:9", gg.TYPE_QWORD)
    gg.refineNumber("98,784,247,822", gg.TYPE_QWORD)
    local results = gg.getResults(9999)
    if #results > 0 then gg.editAll("98,784,247,823", gg.TYPE_QWORD) end
    gg.clearResults()
    gg.toast("MapHack No Icon On")
end

--------------------------------------------------
-- [3] CAMERA DRONE FUNCTIONS
--------------------------------------------------

function scanDrone()
    gg.toast("🔍 Linking Camera Engine...")
    gg.clearResults()
    gg.setRanges(gg.REGION_ANONYMOUS)
    local function doScan(num)
        gg.searchNumber(num, gg.TYPE_FLOAT)
        local r = gg.getResults(500)
        gg.clearResults()
        return r
    end
    V1, V2, V3, V4, V5 = doScan("7.65999984741"), doScan("-10.97999954224"), doScan("7.61999988556"), doScan("-7.65999984741"), doScan("-7.61999988556")
    if #V1 > 0 then scanned = true; gg.toast("✅ Drone Ready") else gg.alert("❌ Scan Failed") end
end

function applyDrone(csv)
    if not scanned then gg.toast("⚠️ Run Step 1 First!"); return end
    local vals = {}
    for v in string.gmatch(csv, '([^,]+)') do table.insert(vals, v) end
    local lists = {V1, V2, V3, V4, V5}
    for i, list in ipairs(lists) do
        if list and #list > 0 then
            gg.loadResults(list)
            local r = gg.getResults(#list)
            for j, v in ipairs(r) do v.value = vals[i] end
            gg.setValues(r)
            gg.clearResults()
        end
    end
end

--------------------------------------------------
-- [4] OTHER FEATURES (STABILITY AUDITED)
--------------------------------------------------

function enemy()
    gg.setRanges(gg.REGION_ANONYMOUS)
    gg.searchNumber("8.0E;1.5e-323E;2.47e-321E;5.93e-322E;6.0e-322E", gg.TYPE_DOUBLE, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.processResume()
    gg.refineNumber("8", gg.TYPE_DOUBLE, false, gg.SIGN_EQUAL, 0, -1, 0)
    local r = gg.getResults(10)
    gg.editAll("15", gg.TYPE_DOUBLE)
    gg.clearResults()
    gg.toast("Enemy Detector On")
end

function grass1()
    gg.setRanges(gg.REGION_C_ALLOC)
    gg.searchNumber("1.0;256.0;20.0:281", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.processResume()
    gg.refineNumber("1", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.editAll("0", gg.TYPE_FLOAT)
    gg.clearResults()
    gg.setRanges(gg.REGION_C_ALLOC)
    gg.searchNumber("1.0F;0.46000000834F;0.30000001192F;0.20000000298F", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.processResume()
    gg.refineNumber("1", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.editAll("0", gg.TYPE_FLOAT)
    gg.toast("No Grass Working (Smooth/High)")
end

function grass2()
    gg.setRanges(gg.REGION_C_ALLOC)
    gg.searchNumber("1.0;2.1019477e-44:25", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.refineNumber("1", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.editAll("2", gg.TYPE_FLOAT)
    gg.processResume()
    gg.clearResults()
    gg.toast("No Grass Black Body")
end

function Hp1() 
    gg.setRanges(gg.REGION_ANONYMOUS)
    gg.searchNumber("3.0F;0.85000002384F;0.69999998808F;1.62550622e-43F", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.refineNumber("3", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    local r = gg.getResults(5000)
    gg.editAll("1", gg.TYPE_FLOAT)
    gg.addListItems(r)
    gg.toast"Large HP Lord Buff OFF"
end

function onoff()
    gg.setRanges(gg.REGION_ANONYMOUS)
    gg.searchNumber("1.0F;0.85000002384F;0.69999998808F;1.62550622e-43F", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.refineNumber("1", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    local r = gg.getResults(5000)
    gg.editAll("3", gg.TYPE_FLOAT)
    gg.addListItems(r)
    gg.toast"Large HP Lord Buff On"
end

function green()
    gg.setRanges(gg.REGION_VIDEO)
    gg.searchNumber("3.5F;0.5F", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.refineNumber("3.5", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.editAll("13", gg.TYPE_FLOAT)
    gg.processResume()
    gg.clearResults()
    gg.toast"Green Hero Active"
end

function white()
    gg.setRanges(gg.REGION_C_ALLOC)
    gg.searchNumber("1.0;0.00019685877;0.00021969635:7465", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.refineNumber("1", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.editAll("9", gg.TYPE_FLOAT)
    gg.processResume()
    gg.clearResults()
    gg.toast"White body in Grass Active"
end

function icon()
    gg.setRanges(gg.REGION_C_ALLOC)
    gg.searchNumber("1.0F;0.00312500005F;1.61424005032F", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.refineNumber("1", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.editAll("1.3", gg.TYPE_FLOAT)
    gg.processResume()
    gg.clearResults()
    gg.toast"Icon Map Size Adjusted"
end

function esp()
    gg.setRanges(gg.REGION_ANONYMOUS)
    gg.searchNumber("1.0F;4.20389539e-45F;-1.0F;1.62550622e-43F", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.refineNumber("1", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.editAll("10", gg.TYPE_FLOAT)
    gg.processResume()
    gg.clearResults()
    gg.toast"Esp Turret Attack Active"
end

function layla()
    gg.setRanges(gg.REGION_ANONYMOUS)
    gg.searchNumber("240;133;2250", gg.TYPE_DWORD, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.refineNumber("133", gg.TYPE_DWORD, false, gg.SIGN_EQUAL, 0, -1, 0)
    local r = gg.getResults(500)
    gg.editAll("999999", gg.TYPE_DWORD)
    gg.addListItems(r)
    gg.clearResults()
    gg.toast"Layla OneHit (AI Only) Active"
end

function white_grass() 
    gg.setRanges(gg.REGION_VIDEO)
    gg.clearResults()
    gg.searchNumber("2.0F;-1.0F;1.0F", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.processResume()
    gg.refineNumber("2", gg.TYPE_FLOAT, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.editAll("9", gg.TYPE_FLOAT)
    gg.processResume()
    gg.clearResults()
    gg.toast"White Grass Active"
end

function showhp()
    gg.setRanges(gg.REGION_ANONYMOUS)
    gg.searchNumber("45.0E;5.7e-322E", gg.TYPE_DOUBLE, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.processResume()
    gg.refineNumber("45", gg.TYPE_DOUBLE, false, gg.SIGN_EQUAL, 0, -1, 0)
    gg.editAll("50", gg.TYPE_DOUBLE)
    gg.processResume()
    gg.clearResults()
    gg.toast"Show HP Active"
end

--------------------------------------------------
-- [ UI ENGINE ]
--------------------------------------------------

function LeoPackage ( tab_view )
    local viewTab = { }
    for k , v in pairs ( tab_view ) do
        if v [ 2 ] == "Switch" then
            viewTab [ # viewTab + 1 ] = { text = v [ 1 ] , isControl = v [ 2 ] , open = v [ 3 ] , close = v [ 4 ] , textColor = v [ 5 ] or CLR_TEXT }
          elseif v [ 2 ] == "Button" then
            viewTab [ # viewTab + 1 ] = { text = v [ 1 ] , isControl = v [ 2 ] , clickEvent = v [ 3 ] , textColor = v [ 4 ] or CLR_TEXT }
        end
    end
    setUi ( viewTab )
end

LeoPackage ( { 
    { "🛡️ PRINZVAN ULTIMATE | VIP", "Button", function(self) end, CLR_TITLE },
    { "Status: Verified System", "Button", function(self) end, CLR_SYSTEM },
    
    -- (1) SECURITY AND BYPASS
    { "─── SECURITY & BYPASS ───", "Button", function(self) end, CLR_HEAD },
    { "ANTI-BAN LOBBY SHIELD", "Switch", function(self) BYPASS_ANTIBAN() end, function(self) end, CLR_ACCENT },
    
    -- (2) MAP VISUAL
    { "─── MAP VISUAL ───", "Button", function(self) end, CLR_HEAD },
    { "MAPHACK WITH ICONS", "Switch", function(self) ULTIMATE_MAPHACK() end, function(self) end, CLR_TEXT },
    { "MAPHACK NO ICONS", "Switch", function(self) map() end, function(self) end, CLR_TEXT },
    
    -- (3) CAMERA DRONE
    { "─── CAMERA DRONE ───", "Button", function(self) end, CLR_HEAD },
    { "STEP 1: INITIALIZE DRONE", "Button", function(self) scanDrone() end, CLR_TEXT },
    { "DRONE VIEW: X1", "Switch", function(self) applyDrone("10,-15,10,-10,-10") end, function(self) applyDrone("7.66,-10.98,7.62,-7.66,-7.62") end, CLR_TEXT },
    { "DRONE VIEW: X2", "Switch", function(self) applyDrone("15,-20,15,-15,-15") end, function(self) applyDrone("7.66,-10.98,7.62,-7.66,-7.62") end, CLR_TEXT },
    { "DRONE VIEW: X3", "Switch", function(self) applyDrone("20,-25,20,-20,-20") end, function(self) applyDrone("7.66,-10.98,7.62,-7.66,-7.62") end, CLR_TEXT },
    
    -- (4) OTHER FEATURES
    { "─── OTHER FEATURES ───", "Button", function(self) end, CLR_HEAD },
    { "Advance Enemy HeroLock", "Switch", function(self) enemy() end, function(self) end, CLR_TEXT },
    { "No Grass Only", "Switch", function(self) grass1() end, function(self) end, CLR_TEXT },
    { "No Grass | Black Hero", "Switch", function(self) grass2() end, function(self) end, CLR_TEXT },
    { "Large Hp Lord Turtle Buff", "Switch", function(self) onoff() end, function(self) Hp1() end, CLR_TEXT },
    { "Green Hero In Grass", "Switch", function(self) green() end, function(self) end, CLR_TEXT },
    { "White Hero In Grass", "Switch", function(self) white() end, function(self) end, CLR_TEXT },
    { "Adjustable Map Icon Size", "Switch", function(self) icon() end, function(self) end, CLR_TEXT },
    { "Esp Turret Attack", "Switch", function(self) esp() end, function(self) end, CLR_TEXT },
    { "OneHit Layla | AI Only", "Switch", function(self) layla() end, function(self) end, CLR_TEXT },
    { "White Grass", "Switch", function(self) white_grass() end, function(self) end, CLR_TEXT },
    { "Show HP", "Switch", function(self) showhp() end, function(self) end, CLR_TEXT },

    { "─── SYSTEM ───", "Button", function(self) end, CLR_HEAD },
    { "EXIT & CLEAR CACHE", "Button", function(self) gg.clearResults() os.exit() end, CLR_SYSTEM }
} )
