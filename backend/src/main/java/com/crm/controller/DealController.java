package com.crm.controller;

import com.crm.model.Deal;
import com.crm.model.Activity;
import com.crm.repository.DealRepository;
import com.crm.repository.ActivityRepository;
import com.crm.repository.PipelineStageRepository;
import com.crm.repository.ContactRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/deals")
@CrossOrigin(origins = "*")
public class DealController {

    @Autowired
    private DealRepository dealRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private PipelineStageRepository stageRepository;

    @Autowired
    private ContactRepository contactRepository;

    @GetMapping
    public List<Deal> getAllDeals() {
        return dealRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Deal> getDealById(@PathVariable Long id) {
        return dealRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/pipeline/{pipelineId}")
    public List<Deal> getDealsByPipeline(@PathVariable Long pipelineId) {
        return dealRepository.findByPipelineIdOrderByStageIdAsc(pipelineId);
    }

    @GetMapping("/contact/{contactId}")
    public List<Deal> getDealsByContact(@PathVariable Long contactId) {
        return dealRepository.findByContactId(contactId);
    }

    @PostMapping
    public Deal createDeal(@RequestBody Deal deal) {
        Deal savedDeal = dealRepository.save(deal);

        // Update contact deal count
        contactRepository.findById(deal.getContact().getId()).ifPresent(contact -> {
            contact.setDealCount(contact.getDealCount() + 1);
            contactRepository.save(contact);
        });

        // Create activity
        Activity activity = new Activity();
        activity.setType("deal_created");
        activity.setTitle("Deal created: " + deal.getTitle());
        activity.setDescription("New deal created with value " + deal.getValue() + " " + deal.getCurrency());
        activity.setContact(deal.getContact());
        activity.setDeal(savedDeal);
        activityRepository.save(activity);

        return savedDeal;
    }

    @PutMapping("/{id}")
    public ResponseEntity<Deal> updateDeal(@PathVariable Long id, @RequestBody Deal dealDetails) {
        return dealRepository.findById(id)
                .map(deal -> {
                    boolean stageChanged = !deal.getStage().getId().equals(dealDetails.getStage().getId());

                    deal.setTitle(dealDetails.getTitle());
                    deal.setDescription(dealDetails.getDescription());
                    deal.setValue(dealDetails.getValue());
                    deal.setCurrency(dealDetails.getCurrency());
                    deal.setExpectedCloseDate(dealDetails.getExpectedCloseDate());
                    deal.setPriority(dealDetails.getPriority());
                    deal.setStage(dealDetails.getStage());

                    Deal updatedDeal = dealRepository.save(deal);

                    // Log stage change activity
                    if (stageChanged) {
                        Activity activity = new Activity();
                        activity.setType("deal_moved");
                        activity.setTitle("Deal moved: " + deal.getTitle());
                        activity.setDescription("Moved to stage: " + dealDetails.getStage().getName());
                        activity.setContact(deal.getContact());
                        activity.setDeal(updatedDeal);
                        activityRepository.save(activity);
                    }

                    return ResponseEntity.ok(updatedDeal);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/status/{status}")
    public ResponseEntity<Deal> updateDealStatus(@PathVariable Long id, @PathVariable String status,
                                                  @RequestBody(required = false) String reason) {
        return dealRepository.findById(id)
                .map(deal -> {
                    deal.setStatus(status);

                    if ("won".equals(status)) {
                        deal.setWonAt(LocalDateTime.now());

                        Activity activity = new Activity();
                        activity.setType("deal_won");
                        activity.setTitle("Deal won: " + deal.getTitle());
                        activity.setDescription("Deal closed successfully with value " + deal.getValue() + " " + deal.getCurrency());
                        activity.setContact(deal.getContact());
                        activity.setDeal(deal);
                        activityRepository.save(activity);
                    } else if ("lost".equals(status)) {
                        deal.setLostAt(LocalDateTime.now());
                        deal.setLostReason(reason);

                        Activity activity = new Activity();
                        activity.setType("deal_lost");
                        activity.setTitle("Deal lost: " + deal.getTitle());
                        activity.setDescription("Reason: " + (reason != null ? reason : "Not specified"));
                        activity.setContact(deal.getContact());
                        activity.setDeal(deal);
                        activityRepository.save(activity);
                    }

                    return ResponseEntity.ok(dealRepository.save(deal));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDeal(@PathVariable Long id) {
        return dealRepository.findById(id)
                .map(deal -> {
                    // Update contact deal count
                    contactRepository.findById(deal.getContact().getId()).ifPresent(contact -> {
                        contact.setDealCount(Math.max(0, contact.getDealCount() - 1));
                        contactRepository.save(contact);
                    });

                    dealRepository.delete(deal);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
