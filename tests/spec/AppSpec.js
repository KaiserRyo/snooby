describe('App', function() {
  it('logs in through snooby', function() {
    sinon.stub(snooby, 'login');
    app.login('username', 'password', sinon.spy());
    expect(snooby.login.called).toBeTruthy();
    snooby.login.restore();
  });

  it('logs out through snooby', function() {
    sinon.stub(snooby, 'logout');
    app.logout(sinon.spy(), sinon.spy());
    expect(snooby.logout.called).toBeTruthy();
    snooby.logout.restore();
  });
});

describe('Voting', function() {
  var cache;

  beforeEach(function() {
    cache = sinon.stub(_cache, 'getPersistedItem');
    cache.withArgs('snooby.gold').returns("true");
  });

  afterEach(function() {
    _cache.getPersistedItem.restore();
  });

  it('Downvotes through snooby', function() {
    var downvote = sinon.stub(snooby, 'vote');
    app.downvote(sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy());
    expect(downvote.args[0][0]).toBe(-1);
    snooby.vote.restore();
  });
  it('Upvotes through snooby', function() {
    var upvote = sinon.stub(snooby, 'vote');
    app.upvote(sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy());
    expect(upvote.args[0][0]).toBe(1);
    snooby.vote.restore();
  });
  it('Unvotes through snooby', function() {
    var unvote = sinon.stub(snooby, 'vote');
    app.unvote(sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy());
    expect(unvote.args[0][0]).toBe(0);
    snooby.vote.restore();
  });
});

describe('app.listing()', function() {
  var server;

  beforeEach(function() {
    server = sinon.fakeServer.create();
  });

  afterEach(function() {
    server.restore();
  });

  it('gets subreddit listings from snooby', function() {
    sinon.spy(snooby, 'listing');
    app.listing(sinon.spy(), sinon.spy());
    expect(snooby.listing.called).toBeTruthy();
    snooby.listing.restore();
  });

  it('stores the current subreddit listing (object) in memory', function() {
    var blackopsListing = responses.reddit.listings.blackops2;
    sinon.spy(_cache, 'setItem');
    server.respondWith('GET',
                       'http://reddit.com/r/blackops2/.json',
                       [200, { "Content-Type": "application/json" }, JSON.stringify(blackopsListing)]);
    app.listing({ subreddits: 'blackops2' });
    server.respond();
    expect(_cache.setItem.calledWith('subreddit.listing', blackopsListing)).toBeTruthy();
    _cache.setItem.restore();
  });

  it('stores the selected subreddit in memory', function() {
    var blackopsListing = responses.reddit.listings.blackops2;
    sinon.spy(_cache, 'setItem');
    server.respondWith('GET',
                       'http://reddit.com/r/blackops2/.json',
                       [200, { "Content-Type": "application/json" }, JSON.stringify(blackopsListing)]);
    app.listing({ subreddits: 'blackops2' });
    server.respond();
    expect(_cache.setItem.calledWith('subreddit.selected', 'blackops2')).toBeTruthy();
    _cache.setItem.restore();
  });

  it('passes every link to the callback', function() {
    var blackopsListing = responses.reddit.listings.blackops2;
    var callback = sinon.spy();
    server.respondWith('GET',
                       'http://reddit.com/r/blackops2/.json',
                       [200, { "Content-Type": "application/json" }, JSON.stringify(blackopsListing)]);
    app.listing({ subreddits: 'blackops2', callback: callback });
    server.respond();
    for (var i = 0; i < blackopsListing.data.children.length; i++)
      expect(JSON.stringify(callback.args[i][0])).toBe(JSON.stringify(blackopsListing.data.children[i]));
  });

  it('passes listing to oncomplete callback', function() {
    var blackopsListing = responses.reddit.listings.blackops2;
    var callback = sinon.spy();
    server.respondWith('GET',
                       'http://reddit.com/r/blackops2/.json',
                       [200, { "Content-Type": "application/json" }, JSON.stringify(blackopsListing)]);
    app.listing({ subreddits: 'blackops2', oncomplete: callback });
    server.respond();

    expect(JSON.stringify(callback.args[0][0])).toBe(JSON.stringify(blackopsListing));
  });
});

describe('app.comments()', function() {
  var server;

  beforeEach(function() {
    server = sinon.fakeServer.create();
  });

  afterEach(function() {
    server.restore();
  });

  it('gets comments through snooby', function() {
    sinon.spy(snooby, 'comments');
    app.comments(sinon.spy(), sinon.spy(), sinon.spy());
    expect(snooby.comments.called).toBeTruthy();
    snooby.comments.restore();
  });

  it('passes the every comment with op to the callback', function() {
    var commentListing = responses.reddit.comments;
    server.respondWith('GET',
                       'http://reddit.com/r/blackops2/comments/187oca/when_did_aftermath_get_so_popular/.json',
                       [200, { "Content-Type": "application/json" }, JSON.stringify(commentListing)]);
    var callback = sinon.spy();
    app.comments('/r/blackops2/comments/187oca/when_did_aftermath_get_so_popular/', 
                 callback);
    server.respond();
    expect(callback.called).toBeTruthy();
  });
  
  it('never passes the first comment (OP) to the callback', function() {
    var commentListing = responses.reddit.comments;
    server.respondWith('GET',
                       'http://reddit.com/r/blackops2/comments/187oca/when_did_aftermath_get_so_popular/.json',
                       [200, { "Content-Type": "application/json" }, JSON.stringify(commentListing)]);
    var callback = sinon.spy();
    var op = sinon.spy();
    app.comments('/r/blackops2/comments/187oca/when_did_aftermath_get_so_popular/', 
                 op, 
                 callback);
    server.respond();
    expect(callback.neverCalledWith(commentListing[0].data.children[0], op)).toBeTruthy();
  });
});

describe('app.subreddits()', function() {
  it('gets default subreddits if there\'s no logged user and no cached reddits', function() {
    var getPersistedItem = sinon.stub(_cache, 'getPersistedItem');
    getPersistedItem.withArgs('snooby.user').returns(null);
    getPersistedItem.withArgs('snooby.subreddits').returns(null);
    
    var callback = sinon.spy();
    var oncomplete = sinon.spy();
    sinon.spy(snooby, 'defaultSubreddits');
    app.subreddits(callback, oncomplete);

    expect(snooby.defaultSubreddits.called).toBeTruthy();
    _cache.getPersistedItem.restore();
    snooby.defaultSubreddits.restore();
  });

  it('gets custom subreddits if there\'s a logged user', function() {
    var getPersistedItem = sinon.stub(_cache, 'getPersistedItem');
    getPersistedItem.withArgs('snooby.user')
                    .returns('{ "username": "achan", "password": "pw", "modhash": "modhash" }');
    getPersistedItem.withArgs('snooby.subreddits').returns(null);
    
    var callback = sinon.spy();
    var oncomplete = sinon.spy();
    sinon.spy(snooby, 'userSubreddits');
    app.subreddits(callback, oncomplete);

    expect(snooby.userSubreddits.called).toBeTruthy();
    _cache.getPersistedItem.restore();
    snooby.userSubreddits.restore();
  });

  it('callbacks are called after retrieving default subreddits', function() {
    var defaultSubs = responses.reddit.subreddits.default;

    sinon.stub(snooby, 'defaultSubreddits', function(callback) {
      callback(defaultSubs.data.children);
    });

    var getPersistedItem = sinon.stub(_cache, 'getPersistedItem');
    getPersistedItem.withArgs('snooby.user').returns(null);
    getPersistedItem.withArgs('snooby.subreddits').returns(null);

    var callback = sinon.spy();
    var oncomplete = sinon.spy();
    app.subreddits(callback, oncomplete);

    expect(callback.alwaysCalledWithMatch({ data: { display_name: sinon.match.string } })).toBeTruthy();
    expect(oncomplete.called).toBeTruthy();
    _cache.getPersistedItem.restore();
    snooby.defaultSubreddits.restore();
  });

  it('subreddits are cached after retrieved', function() {
    var defaultSubs = responses.reddit.subreddits.default;

    sinon.stub(snooby, 'defaultSubreddits', function(callback) {
      callback(defaultSubs.data.children);
    });
    var getPersistedItem = sinon.stub(_cache, 'getPersistedItem');
    getPersistedItem.withArgs('snooby.user').returns(null);
    getPersistedItem.withArgs('snooby.subreddits').returns(JSON.stringify(defaultSubs.data.children));
    sinon.spy(_cache, 'persistItem');

    var callback = sinon.spy();
    var oncomplete = sinon.spy();
    app.subreddits(callback, oncomplete);

    expect(_cache.persistItem.calledWith('snooby.subreddits', 
                                         JSON.stringify(defaultSubs.data.children))).toBeTruthy();
    _cache.getPersistedItem.restore();
    _cache.persistItem.restore();
    snooby.defaultSubreddits.restore();
  });
});

describe('Commenting', function() {
  var cache;
  var limiter;
  var comment;

  beforeEach(function() {
    cache = sinon.stub(_cache, 'getPersistedItem');
    cache.withArgs('snooby.gold').returns("true");
    limiter = sinon.spy(rateLimiter, 'requestAction');
    comment = sinon.spy(snooby, 'comment');
  });

  afterEach(function() {
    _cache.getPersistedItem.restore();
    rateLimiter.requestAction.restore();
    snooby.comment.restore();
  });

  it('Comments use rate limiter', function() {
    app.comment(sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy());
    expect(limiter.called).toBeTruthy();
  });

  it('Comments through snooby', function() {
    app.comment(sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy());
    expect(comment.called).toBeTruthy();
  });
});

describe('Mailbox', function() {
  var cache,
      limiter,
      mailbox,
      markAsRead,
      markAsUnread;

  beforeEach(function() {
    cache = sinon.stub(_cache, 'getPersistedItem');
    cache.withArgs('snooby.gold').returns("true");
    limiter = sinon.spy(rateLimiter, 'requestAction');
    mailbox = sinon.spy(snooby, 'mailbox');
    markAsRead = sinon.spy(snooby, 'markAsRead');
    markAsUnread = sinon.spy(snooby, 'markAsUnread');
  });

  afterEach(function() {
    _cache.getPersistedItem.restore();
    rateLimiter.requestAction.restore();
    snooby.mailbox.restore();
    snooby.markAsRead.restore();
    snooby.markAsUnread.restore();
  });

  it('Inbox Retrieval does not use rate limiter', function() {
    app.mailbox(sinon.spy(), sinon.spy(), sinon.spy());
    expect(limiter.called).toBeFalsy();
  });

  it('Inbox retrieval goes through snooby', function() {
    app.mailbox(sinon.spy(), sinon.spy(), sinon.spy());
    expect(mailbox.called).toBeTruthy();
  });

  it('Mark as read does not use rate limiter', function() {
    app.markAsRead(sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy());
    expect(limiter.called).toBeFalsy();
  });

  it('mark as read goes through snooby', function() {
    app.markAsRead(sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy());
    expect(markAsRead.called).toBeTruthy();
  });

  it('Mark as unread does not use rate limiter', function() {
    app.markAsUnread(sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy());
    expect(limiter.called).toBeFalsy();
  });

  it('mark as unread goes through snooby', function() {
    app.markAsUnread(sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy());
    expect(markAsUnread.called).toBeTruthy();
  });
});

describe('hasMail', function() {
  var server;

  beforeEach(function() {
    server = sinon.fakeServer.create();
  });

  afterEach(function() {
    server.restore();
  });

  it('retrieves unread status from snooby', function() {
    var mockSnooby = sinon.mock(snooby);
    var callback = sinon.spy();
    mockSnooby.expects('mailbox').withArgs('unread', { limit: 1 }).once();
    app.hasMail(callback);
    mockSnooby.verify();
    mockSnooby.restore();
  });

  it('callback passed with true if has new mail', function() {
    var callback = sinon.spy();
    server.respondWith('GET',
                       'http://reddit.com/message/unread.json?limit=1',
                       [ 200, 
                         { "Content-Type": "application/json" }, 
                         JSON.stringify({ data: { children: [1, 2] } }) ]);
    app.hasMail(callback);
    server.respond();
    expect(callback.calledWith(true)).toBeTruthy();
  });

  it('callback passed with false if has no new mail', function() {
    var callback = sinon.spy();
    server.respondWith('GET',
                       'http://reddit.com/message/unread.json?limit=1',
                       [ 200, 
                         { "Content-Type": "application/json" }, 
                         JSON.stringify({ data: { children: [] } }) ]);
    app.hasMail(callback);
    server.respond();
    expect(callback.calledWith(false)).toBeTruthy();
  });
});

describe('Me', function() {
  it('retrieves account information through snooby', function() {
    var callback = sinon.spy();
    var mockSnooby = sinon.mock(snooby);
    mockSnooby.expects('me').once();
    app.me(callback);
    mockSnooby.verify();
    mockSnooby.restore();
  });
});

