var _subreddits = {
  onScreenReady: function(element, params) {
    var visited = _cache.itemExists('subreddit.visited');

    if (!visited) {
      _cache.setItem('subreddit.visited', true);
      _cache.setItem('subreddit.screenReady', true);
      _cache.setItem('subreddit.domReady', false);
      _cache.setItem('subreddit.selected', params.subreddit);
      _cache.setItem('subreddit.scrollTop', 0);
    }

    var actionBar = _cache.getPersistedItem('snooby.subreddits.actionBar');
    if (typeof actionBar === 'undefined' || actionBar === null) {
      app.subreddits(function(subreddit) {
        bbr.createSubredditTabOption(subreddit, function(subredditTab) {
          element.getElementById('actionBar').appendChild(subredditTab);
        });
      }, function() {
        _cache.persistItem('snooby.subreddits.actionBar', element.getElementById('actionBar').innerHTML);
      });
    } else {
      element.getElementById('actionBar').innerHTML = actionBar;
    }
    
    element.getElementById('tab-' + _cache.getItem('subreddit.selected')).setAttribute('data-bb-selected', true);
  },

  onDomReady: function(element, params) {
    if (_cache.getItem('subreddit.domReady') === true) {
      $('#loading').hide();
      console.log('loading subreddit listings from memory');

      var thiz = this;
      var cachedListing = _cache.getItem('subreddit.listing');
      $.each(cachedListing.data.children, function(index, value) {
        setTimeout(function() { thiz.scrollback(); }, 0);
        bbr.formatPost(value, function(bbPost) {
          $(bbPost).appendTo('#listing');
        });
      });
    } else {
      console.log('loading subreddit listings from reddit');
      _cache.setItem('subreddit.domReady', true);
      $('#loading').show();
      $('#listing').hide();
      app.listing(params.subreddit, function(post) {
        $('#loading').hide();
        $('#listing').show();
        bbr.formatPost(post, function(bbPost) {
          $(bbPost).appendTo('#listing');
        });
      });
    }
  },

  onUnload: function(element) {
    _cache.setItem('subreddit.scrollTop', $('#subreddit').children('div').eq(1).scrollTop());
  },

  scrollback: function() {
    $('#subreddit').children('div').eq(1).scrollTop(_cache.getItem('subreddit.scrollTop'));
    $('#listing').show();
  },

  refresh: function() {
    var selectedTab = document.getElementById('tab-' + _cache.getItem('subreddit.selected'));
    _cache.removeItem('subreddit.selected');
    document.getElementById('actionBar').setSelectedTab(selectedTab);
  }
};
