#!/usr/bin/env python3
"""
Mera Shahar, Meri Pehchan - server (Python standard library only, no install needed)

Run:  python3 server.py
Open: http://localhost:8000

Features: user accounts (register/login), posts with photo, likes, comments, profiles.
Data files (data/ folder): posts.json, users.json, sessions.json
Note: DATA_DIR environment variable dekar data ki jagah badli ja sakti hai
      (hosting par persistent disk use karne ke liye kaam aata hai).
"""
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("DATA_DIR") or os.path.join(BASE, "data")
POSTS_FILE = os.path.join(DATA_DIR, "posts.json")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
SESSIONS_FILE = os.path.join(DATA_DIR, "sessions.json")
PORT = int(os.environ.get("PORT", "8000"))
MAX_BODY = 8 * 1024 * 1024  # 8 MB
PBKDF2_ITER = 120_000

VALID_CATEGORIES = {"khana", "jagah", "tyohar", "kala", "prakriti", "other"}
STATIC_EXTS = {".html", ".css", ".js", ".jpg", ".jpeg", ".png", ".webp", ".svg", ".ico", ".gif", ".json"}
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,20}$")

LOCK = threading.Lock()

# ---------------------------------------------------------------- seed data
SEED = [
    dict(title="Taj Mahal — Mohabbat ki Nishani", state="Uttar Pradesh", city="Agra",
         category="jagah", author="Aarav", likes=128, days_ago=20,
         image="assets/taj.jpg",
         description="Duniya ke 7 ajubon mein se ek! Shah Jahan ne apni begum Mumtaz Mahal ki "
                     "yaad mein safed marble se banwaya tha. Subah suraj nikalte time Yamuna "
                     "kinare se iska nazara dil chhu leta hai. Agra aao to Petha khana mat bhoolna!"),
    dict(title="Hawa Mahal — 953 Khidkiyon wala Jaipur", state="Rajasthan", city="Jaipur",
         category="jagah", author="Priya Chauhan", likes=96, days_ago=18,
         image="assets/hawa_mahal.jpg",
         description="Jaipur ki pehchan! Is 5 manzila Jaipur mein 953 chhoti khidkiyan (jharokhe) "
                     "hain, jinse hamesha thandi hawa aati rehti hai — isiliye naam pada "
                     "'Hawa Mahal'. Sham ko roshni mein ye aur bhi sundar dikhta hai."),
    dict(title="Golden Temple aur Duniya ka Sabse Bada Langar", state="Punjab", city="Amritsar",
         category="jagah", author="Simran Kaur", likes=154, days_ago=16,
         image="assets/golden_temple.jpg",
         description="Sri Harmandir Sahib mein roz lagbhag 50,000 logon ko muft langar khilaya "
                     "jaata hai — bina kisi bhed-bhaav ke. Rat ko sarovar mein golden temple ka "
                     "reflection dekhna ek alag hi sukh hai. Waheguru!"),
    dict(title="Kerala Backwaters — Houseboat ki Sair", state="Kerala", city="Alappuzha (Alleppey)",
         category="prakriti", author="Anjali Nair", likes=87, days_ago=14,
         image="assets/kerala.jpg",
         description="Nariyal ke ped, shaant paani aur chalti hui houseboat — Kerala ko 'God's "
                     "Own Country' isiliye kehte hain. Houseboat par baithe-baithe garam-garam "
                     "fish curry aur chawal ka mazaa hi kuch aur hai."),
    dict(title="Meenakshi Mandir — Rango ka Sheher", state="Tamil Nadu", city="Madurai",
         category="jagah", author="Karthik R.", likes=73, days_ago=12,
         image="assets/madurai.jpg",
         description="Madurai ka Meenakshi Mandir apne unche-unche rang-birange gopuram ke liye "
                     "famous hai, jinpar hazaaron chhoti moortiyan bani hain. Mandir ke aas-paas "
                     "ka bazaar raat bhar jag-mag rehta hai — Madurai sach mein 'sone na dene "
                     "wala sheher' (Thoonga Nagaram) hai."),
    dict(title="Gateway of India aur Mumbai ki Shaan", state="Maharashtra", city="Mumbai",
         category="jagah", author="Rohan Deshmukh", likes=69, days_ago=10,
         image="assets/Gateway.jpg",
         description="Arab Sagar ke kinare khada Gateway of India Mumbai ki pehchan hai. Sham "
                     "ko yahan ki bheed, bhel-puri aur samundar ki hawa — poori Mumbai ek jagah "
                     "mil jaati hai. Paas mein hi Vada Pav khana to banta hai!"),
    dict(title="Subah-e-Banaras — Varanasi Aarti", state="Uttar Pradesh", city="Varanasi",
         category="tyohar", author="Shivam Tripathi", likes=142, days_ago=8,
         image="assets/Varanasi.jpg",
         description="Subah 5 baje naav par baithe kar, Varanasi par hone wali aarti aur ugta "
                     "suraj... Banaras duniya ke sabse purane sheheron mein se ek hai. Yahan ki "
                     "galiyan, kachori-sabzi aur Banarasi paan — sab kuch khaas hai. Har Har Mahadev!"),
    dict(title="Assam ke Chai Bagaan", state="Assam", city="Dibrugarh",
         category="prakriti", author="Bornali Das", likes=58, days_ago=6,
         image="assets/assam.jpg",
         description="Aap jo subah ki chai peete ho, uski patti aati hai yahan se! Dibrugarh ko "
                     "'Bharat ki Chai Rajdhani' kehte hain. Door-door tak hare-bhare chai ke "
                     "bagaan aur beech mein Brahmaputra nadi — man khush ho jaata hai."),
    dict(title="Litti Chokha — Bihar ka Swad", state="Bihar", city="Patna",
         category="khana", author="Vikas Kumar", likes=111, days_ago=5,
         image=None,
         description="Sattu bhari hui litti ko koyale par seka jaata hai, upar se desi ghee, "
                     "saath mein baingan-tamatar ka chokha. Ek baar kha liya to bhool nahi "
                     "paoge! Bihar aao, litti chokha khao, dil khush karke jao."),
    dict(title="Durga Puja — Kolkata ka Sabse Bada Tyohar", state="West Bengal", city="Kolkata",
         category="tyohar", author="Sourav Banerjee", likes=134, days_ago=4,
         image=None,
         description="Durga Puja ke 5 din poora Kolkata jaag jaata hai! Har gali mein alag "
                     "theme ke sundar pandal, dhak ki awaaz, aur Rosogolla-Mishti Doi ka swad. "
                     "UNESCO ne ise World Heritage ka darja bhi diya hai."),
    dict(title="Navratri Garba — Gujarat ki Raatein", state="Gujarat", city="Ahmedabad",
         category="tyohar", author="Hetal Patel", likes=92, days_ago=3,
         image=None,
         description="9 raatein, hazaaron log, ek saath Garba! Rang-birangi chaniya choli pehen "
                     "kar poori raat nritya hota hai. Saath mein Dhokla, Fafda-Jalebi... Navratri "
                     "mein Gujarat sona hi bhool jaata hai!"),
    dict(title="Dal Lake ke Shikare", state="Jammu and Kashmir", city="Srinagar",
         category="prakriti", author="Farhan Dar", likes=105, days_ago=2,
         image=None,
         description="'Dharti ka Swarg' Kashmir! Dal Lake mein shikare ki sair, paani par "
                     "tairti sabzi-mandi, aur aas-paas barfeeli pahadiyaan. Sham ko Kahwa chai "
                     "peete-peete sunset dekhna zindagi bhar yaad rehta hai."),
]

# demo comments: post ke title -> [(naam, comment, kitne ghante baad)]
SEED_COMMENTS = {
    "Taj Mahal — Mohabbat ki Nishani": [
        ("Meena Gupta", "Main pichle saal gayi thi, subah 6 baje wala nazara sach mein kamaal hai! 😍", 5),
        ("Rahul Verma", "Agra ka petha aur bedai-jalebi bhi try karna sab log!", 26),
    ],
    "Golden Temple aur Duniya ka Sabse Bada Langar": [
        ("Gurpreet Singh", "Langar ki dal-roti mein jo swad hai, wo kahin nahi milta. Waheguru 🙏", 8),
        ("Anita Sharma", "Rat ko sarovar wala view meri zindagi ka sabse shaant pal tha.", 40),
    ],
    "Subah-e-Banaras — Varanasi Aarti": [
        ("Deepak Yadav", "Har Har Mahadev! 🙏 Assi Ghats ki subah aur garam kachori — swarg yahi hai.", 3),
    ],
    "Litti Chokha — Bihar ka Swad": [
        ("Sunita Devi", "Ghee mein doobi litti... padhte hi muh mein paani aa gaya! 😋", 6),
        ("Amit Kumar", "hamare yahan to ravivaar matlab litti chokha hi hota hai!", 20),
        ("Farhan Dar", "Bihar kabhi gaya nahi, par ye post padhkar jaane ka man kar gaya.", 30),
    ],
    "Kerala Backwaters — Houseboat ki Sair": [
        ("Joseph Mathew", "Houseboat mein ek raat rukna zaroor, taaron wala aasmaan bhool nahi paoge ✨", 12),
    ],
    "Durga Puja — Kolkata ka Sabse Bada Tyohar": [
        ("Priyanka Das", "Pandal ghumna, dhak ki thaap aur bhog ki khichdi — Puja matlab emotions! ❤️", 9),
    ],
    "Navratri Garba — Gujarat ki Raatein": [
        ("Kom", "9 raatein bina thake Garba kiya tha pichli baar! Fafda-jalebi subah 4 baje bhi milti hai 😄", 7),
    ],
    "Dal Lake ke Shikare": [
        ("Sana Mir", "Shikare wale bhaiya ki kahani sunna, Dal Lake ka asli mazaa wahi hai.", 4),
    ],
}


# ---------------------------------------------------------------- storage
def load_json(path, default):
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def save_json(path, data):
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def seed_comments_for(title, base_ts):
    out = []
    for author, text, hours in SEED_COMMENTS.get(title, []):
        out.append(dict(
            id=uuid.uuid4().hex[:10], userId=None, author=author, username=None,
            text=text, createdAt=min(int(time.time()), int(base_ts + hours * 3600)),
        ))
    return out


def init_posts():
    posts = load_json(POSTS_FILE, None)
    changed = False
    if posts is None:
        now = time.time()
        posts = []
        for s in SEED:
            p = dict(s)
            days = p.pop("days_ago")
            p["id"] = uuid.uuid4().hex[:12]
            p["createdAt"] = int(now - days * 86400)
            p["authorId"] = None
            p["username"] = None
            p["likedBy"] = []
            p["comments"] = seed_comments_for(p["title"], p["createdAt"])
            posts.append(p)
        changed = True
    else:
        # purani posts ko naye format mein laana (comments/likes ke hisse jodein)
        for p in posts:
            if "likedBy" not in p:
                p["likedBy"] = []; changed = True
            if "authorId" not in p:
                p["authorId"] = None; changed = True
            if "username" not in p:
                p["username"] = None; changed = True
            if "comments" not in p:
                p["comments"] = seed_comments_for(p.get("title", ""), p.get("createdAt", time.time()))
                changed = True
    if changed:
        save_json(POSTS_FILE, posts)
    return posts


POSTS = init_posts()
USERS = load_json(USERS_FILE, None) or []
SESSIONS = load_json(SESSIONS_FILE, None) or {}


# ---------------------------------------------------------------- auth helpers
def clean(value, limit):
    return str(value or "").strip()[:limit]


def make_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITER)
    return dict(salt=salt.hex(), hash=digest.hex(), iter=PBKDF2_ITER)


def check_password(password, stored):
    try:
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"),
            bytes.fromhex(stored["salt"]), int(stored.get("iter", PBKDF2_ITER)))
        return hmac.compare_digest(digest.hex(), stored["hash"])
    except Exception:
        return False


def public_user(u):
    return dict(id=u["id"], name=u["name"], username=u["username"],
                state=u.get("state", ""), city=u.get("city", ""), bio=u.get("bio", ""),
                createdAt=u.get("createdAt", 0))


def find_user_by_username(username):
    uname = (username or "").strip().lower()
    for u in USERS:
        if u["username"].lower() == uname:
            return u
    return None


def new_session(user_id):
    token = secrets.token_hex(24)
    SESSIONS[token] = dict(userId=user_id, createdAt=int(time.time()))
    save_json(SESSIONS_FILE, SESSIONS)
    return token


def likes_total(p):
    return int(p.get("likes", 0)) + len(p.get("likedBy", []))


def user_stats(user):
    my_posts = [p for p in POSTS if p.get("authorId") == user["id"]]
    comments_made = sum(1 for p in POSTS for c in p.get("comments", []) if c.get("userId") == user["id"])
    comments_received = sum(len(p.get("comments", [])) for p in my_posts)
    return dict(
        myPosts=len(my_posts),
        likesReceived=sum(likes_total(p) for p in my_posts),
        commentsReceived=comments_received,
        commentsMade=comments_made,
    )


class Handler(BaseHTTPRequestHandler):
    server_version = "MeraShahar/2.0"

    # -- response helpers
    def send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return None
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return None

    def current_user(self):
        auth = self.headers.get("Authorization") or ""
        token = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
        sess = SESSIONS.get(token) if token else None
        if not sess:
            return None
        for u in USERS:
            if u["id"] == sess.get("userId"):
                return u
        return None

    def need_user(self):
        user = self.current_user()
        if not user:
            self.send_json({"error": "Pehle login karo, phir ye kaam hoga", "loginRequired": True}, 401)
            return None
        return user

    # -- GET
    def do_GET(self):
        path = unquote(urlparse(self.path).path)
        if path == "/api/posts":
            with LOCK:
                data = sorted(POSTS, key=lambda p: p["createdAt"], reverse=True)
            return self.send_json(data)
        if path == "/api/me":
            user = self.need_user()
            if user:
                return self.send_json({"user": public_user(user), "stats": user_stats(user)})
            return
        return self.serve_static(path)

    def serve_static(self, path):
        if path in ("/", ""):
            path = "/index.html"
        ext = os.path.splitext(path)[1].lower()
        if ext not in STATIC_EXTS:
            return self.send_error(404, "Not found")
        full = os.path.normpath(os.path.join(BASE, path.lstrip("/")))
        real_data = os.path.realpath(DATA_DIR)
        if not full.startswith(BASE) or full.startswith(real_data) or os.path.sep + "data" + os.path.sep in full:
            return self.send_error(403, "Forbidden")
        if not os.path.isfile(full):
            return self.send_error(404, "Not found")
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        with open(full, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype + ("; charset=utf-8" if ctype.startswith("text") or "javascript" in ctype or ctype == "application/json" else ""))
        self.send_header("Content-Length", str(len(body)))
        if ext in (".html", ".css", ".js", ".json"):
            # browser ko purani copy rokne se mana karo - har baar nayi file lo
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.end_headers()
        self.wfile.write(body)

    # -- POST routes
    def do_POST(self):
        path = unquote(urlparse(self.path).path)
        parts = [p for p in path.split("/") if p]
        if path == "/api/register":
            return self.register()
        if path == "/api/login":
            return self.login()
        if path == "/api/logout":
            return self.logout()
        if path == "/api/posts":
            return self.create_post()
        if len(parts) == 4 and parts[:2] == ["api", "posts"] and parts[3] == "like":
            return self.like_post(parts[2])
        if len(parts) == 4 and parts[:2] == ["api", "posts"] and parts[3] == "comments":
            return self.add_comment(parts[2])
        return self.send_json({"error": "route nahi mila"}, 404)

    def register(self):
        data = self.read_json_body() or {}
        name = clean(data.get("name"), 40)
        username = clean(data.get("username"), 20)
        password = str(data.get("password") or "")
        state = clean(data.get("state"), 60)
        city = clean(data.get("city"), 60)
        if len(name) < 2:
            return self.send_json({"error": "Apna naam sahi se likho (kam se kam 2 akshar)"}, 400)
        if not USERNAME_RE.match(username):
            return self.send_json({"error": "Username 3-20 akshar ka ho, sirf English akshar (a-z), number (0-9) ya _ use karo"}, 400)
        if len(password) < 4 or len(password) > 72:
            return self.send_json({"error": "Password kam se kam 4 akshar ka hona chahiye"}, 400)
        with LOCK:
            if find_user_by_username(username):
                return self.send_json({"error": "ye username pehle se kisi aur ka hai, koi aur chunein"}, 409)
            user = dict(
                id=uuid.uuid4().hex[:12], name=name, username=username,
                password=make_password(password), state=state, city=city, bio="",
                createdAt=int(time.time()),
            )
            USERS.append(user)
            save_json(USERS_FILE, USERS)
            token = new_session(user["id"])
        return self.send_json({"token": token, "user": public_user(user)}, 201)

    def login(self):
        data = self.read_json_body() or {}
        username = clean(data.get("username"), 40)
        password = str(data.get("password") or "")
        with LOCK:
            user = find_user_by_username(username)
            if not user or not check_password(password, user.get("password", {})):
                return self.send_json({"error": "Username ya password galat hai. Dobara check karo."}, 401)
            token = new_session(user["id"])
        return self.send_json({"token": token, "user": public_user(user)})

    def logout(self):
        auth = self.headers.get("Authorization") or ""
        token = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
        with LOCK:
            if token in SESSIONS:
                del SESSIONS[token]
                save_json(SESSIONS_FILE, SESSIONS)
        return self.send_json({"ok": True})

    def do_PUT(self):
        path = unquote(urlparse(self.path).path)
        if path == "/api/me":
            return self.update_profile()
        return self.send_json({"error": "route nahi mila"}, 404)

    def update_profile(self):
        user = self.need_user()
        if not user:
            return
        data = self.read_json_body() or {}
        with LOCK:
            if "name" in data:
                name = clean(data.get("name"), 40)
                if len(name) < 2:
                    return self.send_json({"error": "Naam kam se kam 2 akshar ka rakho"}, 400)
                user["name"] = name
            if "state" in data:
                user["state"] = clean(data.get("state"), 60)
            if "city" in data:
                user["city"] = clean(data.get("city"), 60)
            if "bio" in data:
                user["bio"] = clean(data.get("bio"), 200)
            save_json(USERS_FILE, USERS)
        return self.send_json({"user": public_user(user), "stats": user_stats(user)})

    def create_post(self):
        user = self.need_user()
        if not user:
            return
        data = self.read_json_body()
        if data is None:
            return self.send_json({"error": "Galat data bheja gaya"}, 400)
        title = clean(data.get("title"), 80)
        state = clean(data.get("state"), 60)
        city = clean(data.get("city"), 60)
        description = clean(data.get("description"), 1500)
        category = clean(data.get("category"), 20)
        if category not in VALID_CATEGORIES:
            category = "other"
        image = data.get("image")
        if image is not None:
            if not (isinstance(image, str) and image.startswith("data:image/") and len(image) <= 6_000_000):
                return self.send_json({"error": "Photo bahut badi hai ya galat format hai"}, 400)
        if not (title and state and city and description):
            return self.send_json({"error": "Title, Rajya, shahar/gaon aur description zaroori hai"}, 400)
        post = dict(
            id=uuid.uuid4().hex[:12],
            title=title, state=state, city=city, category=category,
            author=user["name"], authorId=user["id"], username=user["username"],
            description=description, image=image,
            likes=0, likedBy=[], comments=[], createdAt=int(time.time()),
        )
        with LOCK:
            POSTS.append(post)
            save_json(POSTS_FILE, POSTS)
        return self.send_json(post, 201)

    def like_post(self, post_id):
        user = self.need_user()
        if not user:
            return
        with LOCK:
            for p in POSTS:
                if p["id"] == post_id:
                    liked_by = p.setdefault("likedBy", [])
                    if user["id"] in liked_by:
                        liked_by.remove(user["id"])
                        liked = False
                    else:
                        liked_by.append(user["id"])
                        liked = True
                    save_json(POSTS_FILE, POSTS)
                    return self.send_json({"id": post_id, "likes": likes_total(p), "liked": liked})
        return self.send_json({"error": "post nahi mili"}, 404)

    def add_comment(self, post_id):
        user = self.need_user()
        if not user:
            return
        data = self.read_json_body() or {}
        text = clean(data.get("text"), 500)
        if not text:
            return self.send_json({"error": "Pehle comment mein kuch likho"}, 400)
        comment = dict(
            id=uuid.uuid4().hex[:10], userId=user["id"],
            author=user["name"], username=user["username"],
            text=text, createdAt=int(time.time()),
        )
        with LOCK:
            for p in POSTS:
                if p["id"] == post_id:
                    p.setdefault("comments", []).append(comment)
                    save_json(POSTS_FILE, POSTS)
                    return self.send_json(comment, 201)
        return self.send_json({"error": "post nahi mili"}, 404)

    # -- DELETE
    def do_DELETE(self):
        path = unquote(urlparse(self.path).path)
        parts = [p for p in path.split("/") if p]
        user = self.need_user()
        if not user:
            return
        if len(parts) == 3 and parts[:2] == ["api", "posts"]:
            with LOCK:
                for p in POSTS:
                    if p["id"] == parts[2]:
                        if p.get("authorId") != user["id"]:
                            return self.send_json({"error": "ye post aapki nahi hai, aap ise nahi hata sakte"}, 403)
                        POSTS.remove(p)
                        save_json(POSTS_FILE, POSTS)
                        return self.send_json({"ok": True})
            return self.send_json({"error": "post nahi mili"}, 404)
        if len(parts) == 5 and parts[:2] == ["api", "posts"] and parts[3] == "comments":
            with LOCK:
                for p in POSTS:
                    if p["id"] == parts[2]:
                        for c in p.get("comments", []):
                            if c["id"] == parts[4]:
                                if c.get("userId") != user["id"] and p.get("authorId") != user["id"]:
                                    return self.send_json({"error": "ye comment aap nahi hata sakte"}, 403)
                                p["comments"].remove(c)
                                save_json(POSTS_FILE, POSTS)
                                return self.send_json({"ok": True})
            return self.send_json({"error": "comment nahi mila"}, 404)
        return self.send_json({"error": "route nahi mila"}, 404)

    def log_message(self, fmt, *args):
        pass  # quiet logs


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Mera Shahar, Meri Pehchan chal raha hai -> http://0.0.0.0:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
