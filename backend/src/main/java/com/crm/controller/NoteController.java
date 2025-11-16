package com.crm.controller;

import com.crm.model.Note;
import com.crm.model.Activity;
import com.crm.repository.NoteRepository;
import com.crm.repository.ActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
@CrossOrigin(origins = "*")
public class NoteController {

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @GetMapping("/contact/{contactId}")
    public List<Note> getNotesByContact(@PathVariable Long contactId) {
        return noteRepository.findByContactIdOrderByCreatedAtDesc(contactId);
    }

    @PostMapping
    public Note createNote(@RequestBody Note note) {
        Note savedNote = noteRepository.save(note);

        // Create activity
        Activity activity = new Activity();
        activity.setType("note_added");
        activity.setTitle("Note added");
        activity.setDescription(note.getContent().substring(0, Math.min(100, note.getContent().length())) + "...");
        activity.setContact(note.getContact());
        activityRepository.save(activity);

        return savedNote;
    }

    @PutMapping("/{id}")
    public ResponseEntity<Note> updateNote(@PathVariable Long id, @RequestBody Note noteDetails) {
        return noteRepository.findById(id)
                .map(note -> {
                    note.setContent(noteDetails.getContent());
                    return ResponseEntity.ok(noteRepository.save(note));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable Long id) {
        return noteRepository.findById(id)
                .map(note -> {
                    noteRepository.delete(note);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
