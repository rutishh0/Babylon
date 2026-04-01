package com.babylon.app.ui.discover

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class DiscoverViewModel @Inject constructor() : ViewModel() {
    val genres = listOf(
        "Action", "Adventure", "Comedy", "Drama", "Fantasy",
        "Horror", "Music", "Mystery", "Romance", "Sci-Fi",
        "Seinen", "Shojo", "Shonen", "Slice of Life", "Sports",
        "Supernatural", "Thriller",
    )
}
