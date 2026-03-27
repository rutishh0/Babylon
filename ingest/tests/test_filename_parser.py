"""
Tests for ingest/filename_parser.py

Run with:
    cd ingest && python -m pytest tests/test_filename_parser.py -v
"""

import pytest
from filename_parser import parse_episode, is_non_episode


class TestParseEpisode:
    """Episode number extraction from filenames."""

    # --- S01E03 pattern ---
    def test_sxxexx_standard(self):
        assert parse_episode("[SubsPlease] Show Name S01E03 (1080p) [ABCD1234].mkv") == 3

    def test_sxxexx_two_digit_episode(self):
        assert parse_episode("[SubsPlease] Show S01E12 (1080p).mkv") == 12

    def test_sxxexx_three_digit_episode(self):
        assert parse_episode("Show S02E100 [1080p].mkv") == 100

    def test_sxxexx_single_digit_season(self):
        assert parse_episode("Show S1E5 (720p).mkv") == 5

    def test_sxxexx_uppercase(self):
        assert parse_episode("SHOW S03E07.mkv") == 7

    # --- Dash-space pattern (SubsPlease standard) ---
    def test_dash_ep_standard(self):
        assert parse_episode("[SubsPlease] Mushoku Tensei - 03 (1080p) [ABCD1234].mkv") == 3

    def test_dash_ep_two_digit(self):
        assert parse_episode("[SubsPlease] Re Zero - 25 (1080p).mkv") == 25

    def test_dash_ep_at_end_of_filename(self):
        assert parse_episode("Show - 01.mkv") == 1

    def test_dash_ep_before_bracket(self):
        assert parse_episode("[Sub] Anime - 07 [1080p].mkv") == 7

    # --- "Episode NN" pattern ---
    def test_episode_word_lowercase(self):
        assert parse_episode("episode 01.mkv") == 1

    def test_episode_word_titlecase(self):
        assert parse_episode("Episode 12.mkv") == 12

    def test_episode_word_uppercase(self):
        assert parse_episode("EPISODE 05.mkv") == 5

    def test_episode_word_with_prefix(self):
        assert parse_episode("Show Name Episode 03 [1080p].mkv") == 3

    # --- Bare E pattern ---
    def test_bare_e_standard(self):
        assert parse_episode("Show E12 [1080p].mkv") == 12

    def test_bare_e_lowercase(self):
        # E is case-insensitive but must not be preceded by S digit
        assert parse_episode("show e05.mkv") == 5

    def test_bare_e_not_confused_with_sxxexx(self):
        # S01E03 should be matched by SxxExx pattern and return 3, not some other value
        assert parse_episode("Show S01E03.mkv") == 3

    # --- Bare number pattern ---
    def test_bare_number_only_stem(self):
        assert parse_episode("03.mkv") == 3

    def test_bare_number_two_digit(self):
        assert parse_episode("12.mkv") == 12

    def test_bare_number_with_space(self):
        assert parse_episode("07 [1080p].mkv") == 7

    # --- Edge cases ---
    def test_no_episode_number(self):
        assert parse_episode("[SubsPlease] Show (1080p) [ABCD1234].mkv") is None

    def test_empty_string(self):
        assert parse_episode("") is None

    def test_path_with_directory(self):
        # Should only look at basename
        assert parse_episode("/downloads/raw/Show/[Sub] Show - 05 (1080p).mkv") == 5

    def test_windows_path(self):
        assert parse_episode("C:\\downloads\\Show - 07 [1080p].mkv") == 7

    def test_year_not_confused_as_episode(self):
        # Years like 2024 should not match bare-number pattern (3-digit cap on bare num)
        result = parse_episode("Show (2024) [1080p].mkv")
        # Should be None or not 2024 — our bare_num is capped at 3 digits so 2024 won't match
        assert result is None or result < 1000


class TestIsNonEpisode:
    """Non-episode file detection."""

    def test_nced(self):
        assert is_non_episode("[SubsPlease] Show NCED (1080p).mkv") is True

    def test_ncop(self):
        assert is_non_episode("[SubsPlease] Show NCOP (1080p).mkv") is True

    def test_ova(self):
        assert is_non_episode("Show OVA 01 [1080p].mkv") is True

    def test_special(self):
        assert is_non_episode("Show Special 01 [1080p].mkv") is True

    def test_pv(self):
        assert is_non_episode("Show PV 01.mkv") is True

    def test_preview(self):
        assert is_non_episode("Show Preview (1080p).mkv") is True

    def test_trailer(self):
        assert is_non_episode("Show Trailer.mkv") is True

    def test_menu(self):
        assert is_non_episode("Menu.mkv") is True

    def test_extra(self):
        assert is_non_episode("Show Extra 01.mkv") is True

    def test_creditless(self):
        assert is_non_episode("Show Creditless OP.mkv") is True

    def test_case_insensitive(self):
        assert is_non_episode("show nced.mkv") is True
        assert is_non_episode("SHOW OVA 01.MKV") is True

    def test_normal_episode_not_flagged(self):
        assert is_non_episode("[SubsPlease] Show - 03 (1080p) [ABCD1234].mkv") is False

    def test_normal_episode_s01e03(self):
        assert is_non_episode("[SubsPlease] Show S01E03 (1080p).mkv") is False

    def test_empty_string(self):
        assert is_non_episode("") is False
